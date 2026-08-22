"use server";

import { randomUUID } from "node:crypto";
import { JmapClient } from "@jmap/client";
import {
    createSecret,
    identities,
    jmapAccounts,
    providers,
    updateSecret,
    workspaceIdentityMembers,
} from "@db";

import {
    currentSession,
    isSignedIn,
} from "@/lib/actions/auth";

import {
    getWorkspaceId,
    rlsClient,
} from "@/lib/actions/clients";

import {
    FormState,
    handleAction,
    JMAP_PRESETS,
    type JmapPresetKey,
} from "@schema";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { decode } from "decode-formdata";
import { getRedis } from "@/lib/actions/get-redis";

const PROVIDERS_PATH =
    "/w/[workspaceId]/dashboard/platform/providers";

export async function initializeJmapIdentity(
    identityId: string,
    workspaceId: string,
) {
    const { jmapQueue } = await getRedis();

    await jmapQueue.add(
        "jmap:backfill-discover",
        {
            identityId,
            workspaceId,
        },
        {
            jobId: `jmap-backfill-discover-${identityId}`,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    );
}

async function resolveJmapSession(
    token: string,
    sessionUrl: string,
) {
    const cleanToken = token.trim();

    if (!cleanToken) {
        throw new Error("JMAP API token is required");
    }

    const client = new JmapClient(
        cleanToken,
        sessionUrl,
    );

    const session = await client.getSession();
    const sessionEntries = Object.entries(session.accounts);

    if (!sessionEntries.length) {
        throw new Error("No JMAP accounts were returned");
    }

    return {
        token: cleanToken,
        session,
        sessionEntries,
    };
}

export async function connectJmap(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const data = decode(formData) as Record<string, unknown>;

        const presetKey = String(
            data.preset ?? "",
        ) as JmapPresetKey;

        const preset = JMAP_PRESETS[presetKey];

        if (!preset) {
            throw new Error("Unsupported JMAP preset");
        }

        const {
            token,
            session,
            sessionEntries,
        } = await resolveJmapSession(
            String(data.token ?? ""),
            preset.sessionUrl,
        );

        const user = await isSignedIn();

        if (!user?.id) {
            throw new Error("Unauthorized");
        }

        const ownerId = String(user.id);
        const workspaceId = await getWorkspaceId();
        const authSession = await currentSession();
        const rls = await rlsClient();

        /*
         * The JMAP provider is created when the workspace/user
         * is provisioned, so connecting JMAP should never create
         * another provider.
         */
        const [provider] = await rls((tx) =>
            tx
                .select()
                .from(providers)
                .where(
                    and(
                        eq(providers.type, "jmap"),
                        eq(providers.ownerId, ownerId),
                        eq(providers.workspaceId, workspaceId),
                    ),
                )
                .limit(1),
        );

        if (!provider) {
            throw new Error(
                "JMAP provider is not configured for this workspace",
            );
        }

        /*
         * A JMAP session may expose multiple accounts.
         *
         * If any of these accounts has already been connected,
         * reuse the existing credential rather than creating
         * another secret.
         */
        let tokenSecretId: string | null = null;

        for (const [accountId] of sessionEntries) {
            const [existingAccount] = await rls((tx) =>
                tx
                    .select()
                    .from(jmapAccounts)
                    .where(
                        and(
                            eq(
                                jmapAccounts.providerId,
                                provider.id,
                            ),
                            eq(
                                jmapAccounts.accountId,
                                accountId,
                            ),
                        ),
                    )
                    .limit(1),
            );

            if (existingAccount?.tokenSecretId) {
                tokenSecretId =
                    existingAccount.tokenSecretId;
                break;
            }
        }

        /*
         * Existing connection:
         * update its encrypted token in place.
         *
         * New connection:
         * create one credential shared by all accounts exposed
         * by this JMAP session.
         */
        if (tokenSecretId) {
            await updateSecret(
                authSession,
                workspaceId,
                tokenSecretId,
                {
                    value: token,
                    description: `${preset.name} JMAP API token`,
                },
            );
        } else {
            const secret = await createSecret(
                authSession,
                workspaceId,
                {
                    name: `jmap-${presetKey}-${randomUUID()}`,
                    value: token,
                    description: `${preset.name} JMAP API token`,
                    managedBy: "system",
                },
            );

            tokenSecretId = secret.id;
        }

        for (const [accountId, account] of sessionEntries) {
            const username = String(
                account.name ||
                session.username ||
                "",
            ).trim();

            if (!username) {
                throw new Error(
                    `JMAP account ${accountId} did not provide a username`,
                );
            }

            /*
             * providerId + accountId identifies the external
             * JMAP account.
             */
            const [existingJmapAccount] = await rls((tx) =>
                tx
                    .select()
                    .from(jmapAccounts)
                    .where(
                        and(
                            eq(
                                jmapAccounts.providerId,
                                provider.id,
                            ),
                            eq(
                                jmapAccounts.accountId,
                                accountId,
                            ),
                        ),
                    )
                    .limit(1),
            );

            let identity;

            /*
             * Reconnecting an existing JMAP account should keep
             * using the identity already attached to it.
             */
            if (existingJmapAccount?.identityId) {
                [identity] = await rls((tx) =>
                    tx
                        .select()
                        .from(identities)
                        .where(
                            eq(
                                identities.id,
                                existingJmapAccount.identityId,
                            ),
                        )
                        .limit(1),
                );
            }

            /*
             * For a new JMAP account, reuse an existing email
             * identity when possible.
             */
            if (!identity) {
                [identity] = await rls((tx) =>
                    tx
                        .select()
                        .from(identities)
                        .where(
                            and(
                                eq(
                                    identities.workspaceId,
                                    workspaceId,
                                ),
                                eq(
                                    identities.kind,
                                    "email",
                                ),
                                eq(
                                    identities.value,
                                    username,
                                ),
                            ),
                        )
                        .limit(1),
                );
            }

            /*
             * Otherwise create the identity.
             */
            if (!identity) {
                const identityId = randomUUID();

                await rls(async (tx) => {
                    await tx
                        .insert(identities)
                        .values({
                            id: identityId,
                            ownerId,
                            workspaceId,
                            kind: "email",
                            value: username,
                            displayName:
                                account.name || username,
                            providerId: provider.id,
                            status: "verified",
                            metaData: {
                                provider: "jmap",
                                jmap: {
                                    accountId,
                                },
                            },
                        });

                    await tx
                        .insert(workspaceIdentityMembers)
                        .values({
                            workspaceId,
                            identityId,
                            userId: ownerId,
                        })
                        .onConflictDoNothing();
                });

                [identity] = await rls((tx) =>
                    tx
                        .select()
                        .from(identities)
                        .where(
                            eq(
                                identities.id,
                                identityId,
                            ),
                        )
                        .limit(1),
                );
            }

            if (!identity) {
                throw new Error(
                    `Could not create identity for ${username}`,
                );
            }

            /*
             * An existing identity may have been created before
             * JMAP was connected. Attach it to the JMAP provider.
             */
            await rls((tx) =>
                tx
                    .update(identities)
                    .set({
                        providerId: provider.id,
                        status: "verified",
                        metaData: {
                            ...(identity.metaData ?? {}),
                            provider: "jmap",
                            jmap: {
                                ...((identity.metaData as any)?.jmap ??
                                    {}),
                                accountId,
                            },
                        },
                        updatedAt: new Date(),
                    })
                    .where(
                        eq(
                            identities.id,
                            identity.id,
                        ),
                    ),
            );

            /*
             * Safe when Connect is called repeatedly.
             */
            await rls((tx) =>
                tx
                    .insert(workspaceIdentityMembers)
                    .values({
                        workspaceId,
                        identityId: identity.id,
                        userId: ownerId,
                    })
                    .onConflictDoNothing(),
            );

            /*
             * Upsert using the stable JMAP account identifier.
             */
            const [jmapAccount] = await rls((tx) =>
                tx
                    .insert(jmapAccounts)
                    .values({
                        ownerId,
                        workspaceId,
                        providerId: provider.id,
                        identityId: identity.id,
                        accountId,
                        username,
                        sessionUrl: preset.sessionUrl,
                        preset: presetKey,
                        tokenSecretId,
                        syncState: {},
                    })
                    .onConflictDoUpdate({
                        target: [
                            jmapAccounts.providerId,
                            jmapAccounts.accountId,
                        ],
                        set: {
                            identityId: identity.id,
                            username,
                            sessionUrl:
                            preset.sessionUrl,
                            preset: presetKey,
                            tokenSecretId,
                            updatedAt: new Date(),
                        },
                    })
                    .returning(),
            );

            if (!jmapAccount) {
                throw new Error(
                    `Could not create JMAP account for ${username}`,
                );
            }

            /*
             * Start mailbox discovery.
             *
             * The worker owns the rest of the backfill chain.
             */
            await initializeJmapIdentity(
                identity.id,
                workspaceId,
            );
        }

        revalidatePath(PROVIDERS_PATH, "page");

        return {
            success: true,
            message: `${sessionEntries.length} JMAP account${
                sessionEntries.length === 1 ? "" : "s"
            } connected`,
        };
    });
}

export async function updateJmapToken(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const data = decode(formData) as Record<string, unknown>;

        const jmapAccountId = String(
            data.jmapAccountId ?? "",
        ).trim();

        if (!jmapAccountId) {
            throw new Error("JMAP account is required");
        }

        const workspaceId = await getWorkspaceId();
        const authSession = await currentSession();
        const rls = await rlsClient();

        const [account] = await rls((tx) =>
            tx
                .select()
                .from(jmapAccounts)
                .where(
                    and(
                        eq(
                            jmapAccounts.id,
                            jmapAccountId,
                        ),
                        eq(
                            jmapAccounts.workspaceId,
                            workspaceId,
                        ),
                    ),
                )
                .limit(1),
        );

        if (!account) {
            throw new Error("JMAP account not found");
        }

        const {
            token,
            session,
        } = await resolveJmapSession(
            String(data.token ?? ""),
            account.sessionUrl,
        );

        if (!session.accounts[account.accountId]) {
            throw new Error(
                "The API token does not grant access to this JMAP account",
            );
        }

        /*
         * Update the existing shared credential in place.
         */
        await updateSecret(
            authSession,
            workspaceId,
            account.tokenSecretId,
            {
                value: token,
            },
        );

        /*
         * Touch every JMAP account sharing this credential.
         */
        await rls((tx) =>
            tx
                .update(jmapAccounts)
                .set({
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(
                            jmapAccounts.workspaceId,
                            workspaceId,
                        ),
                        eq(
                            jmapAccounts.tokenSecretId,
                            account.tokenSecretId,
                        ),
                    ),
                ),
        );

        revalidatePath(PROVIDERS_PATH, "page");

        return {
            success: true,
            message: "JMAP token updated",
        };
    });
}

export const fetchJmapAccounts = async () => {
    const rls = await rlsClient();

    return await rls((tx) =>
        tx
            .select()
            .from(jmapAccounts),
    );
};

export type FetchJmapAccountsResult =
    Awaited<ReturnType<typeof fetchJmapAccounts>>;
