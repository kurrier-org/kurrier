"use server";

import {
    createSecret,
    db, deleteSecretAdmin,
    identities,
    IdentityCreate,
    IdentityInsertSchema, smtpAccounts, smtpAccountSecrets, updateSecret,
} from "@db";
import {
    defaultImapQuota,
    FormState, handleAction,
} from "@schema";
import {currentSession, isSignedIn} from "@/lib/actions/auth";
import {getWorkspaceId, rlsClient} from "@/lib/actions/clients";
import { checkDefaultWorkspaceIdentity } from "@/lib/actions/workspace";
import {assignIdentityToAllWorkspaceMembers, fetchDecryptedSecrets, initializeMailboxes} from "@/lib/actions/dashboard";
import {createMailer, VerifyResult, refreshMicrosoftAccessToken, isMicrosoftTokenExpired} from "@providers";
import {eq} from "drizzle-orm";

export type CreateEmailIdentityInput = {
    email: string;
    displayName?: string;
    smtpAccountId: string;
    dailyQuota?: number;
};

export async function createEmailIdentity(
    input: CreateEmailIdentityInput,
): Promise<FormState> {
    const workspaceId = await getWorkspaceId();
    const userId = String((await isSignedIn())?.id ?? "");

    if (!userId) {
        return {
            success: false,
            error: "dashboard.notSignedIn",
        };
    }

    const identityData = IdentityInsertSchema.parse({
        workspaceId,
        ownerId: userId,
        kind: "email",
        value: input.email,
        displayName: input.displayName || input.email,
        smtpAccountId: input.smtpAccountId,
        sharedWithWorkspace: true,
        metaData: {
            dailyQuota: input.dailyQuota || defaultImapQuota,
            sharedWithWorkspace: true,
        },
    });

    const [identity] = await db
        .insert(identities)
        .values(identityData as IdentityCreate)
        .returning();

    await checkDefaultWorkspaceIdentity();
    await assignIdentityToAllWorkspaceMembers(identity);
    await initializeMailboxes(identity, userId, workspaceId);

    return {
        success: true,
        message: "dashboard.addedNewIdentity",
    };
}

export async function verifySMTPAccount(
    smtpAccountId: string,
): Promise<FormState<VerifyResult>> {
    return handleAction(async () => {
        const [smtpSecret] = await fetchDecryptedSecrets({
            linkTable: smtpAccountSecrets,
            foreignCol: smtpAccountSecrets.accountId,
            secretIdCol: smtpAccountSecrets.secretId,
            parentId: smtpAccountId,
        });

        if (!smtpSecret) {
            throw new Error("SMTP account secret not found");
        }

        let parsedVaultValues = smtpSecret.parsedSecret;
        const session = await currentSession();
        const workspaceId = await getWorkspaceId();

        if (parsedVaultValues.provider === "microsoft" && parsedVaultValues.MICROSOFT_REFRESH_TOKEN && parsedVaultValues.SMTP_TOKEN_EXPIRES_AT && isMicrosoftTokenExpired(new Date(parsedVaultValues.SMTP_TOKEN_EXPIRES_AT))) {
            const refreshed = await refreshMicrosoftAccessToken({ clientId: String(parsedVaultValues.MICROSOFT_CLIENT_ID), refreshToken: String(parsedVaultValues.MICROSOFT_REFRESH_TOKEN), tenant: String(parsedVaultValues.MICROSOFT_TENANT) });
            parsedVaultValues = { ...parsedVaultValues, SMTP_ACCESS_TOKEN: refreshed.accessToken, IMAP_ACCESS_TOKEN: refreshed.accessToken, MICROSOFT_REFRESH_TOKEN: refreshed.refreshToken ?? parsedVaultValues.MICROSOFT_REFRESH_TOKEN, SMTP_TOKEN_EXPIRES_AT: refreshed.expiresAt.toISOString(), IMAP_TOKEN_EXPIRES_AT: refreshed.expiresAt.toISOString() };
            await updateSecret(session, workspaceId, smtpSecret.metaId, { value: JSON.stringify(parsedVaultValues) });
        }

        const mailer = createMailer("smtp", parsedVaultValues);
        const res = await mailer.verify(smtpAccountId);

        parsedVaultValues.sendVerified = res?.meta?.send;
        parsedVaultValues.receiveVerified = res?.meta?.receive;

        await updateSecret(session, workspaceId, smtpSecret.metaId, {
            value: JSON.stringify(parsedVaultValues),
        });

        return {
            success: res.ok,
            message: res.message,
            data: res,
        };
    });
}

export type CreateSMTPAccountInput = {
    label?: string;
    ulid: string;
    required: Record<string, unknown>;
    optional?: Record<string, unknown>;
};

export async function createSMTPAccount(
    input: CreateSMTPAccountInput,
): Promise<FormState<{ accountId: string }>> {
    return handleAction(async () => {
        const session = await currentSession();
        const workspaceId = await getWorkspaceId();
        const rls = await rlsClient();

        const smtpConfig: Record<string, unknown> = {
            ulid: input.ulid,
            label: String(input.label || "My SMTP Account").trim(),
            ...input.required,
            ...input.optional,
        };

        const secretMeta = await createSecret(session, workspaceId, {
            name: input.ulid,
            value: JSON.stringify(smtpConfig),
        });

        const [smtpAccount] = await rls((tx) =>
            tx
                .insert(smtpAccounts)
                .values({})
                .returning(),
        );

        await rls((tx) =>
            tx
                .insert(smtpAccountSecrets)
                .values({
                    accountId: smtpAccount.id,
                    secretId: secretMeta.id,
                }),
        );

        const verification = await verifySMTPAccount(smtpAccount.id);

        if (!verification.success) {
            await rls((tx) =>
                tx
                    .delete(smtpAccounts)
                    .where(eq(smtpAccounts.id, smtpAccount.id)),
            );

            await deleteSecretAdmin(secretMeta.id);

            return {
                success: false,
                error:
                    verification.error ||
                    verification.message ||
                    "SMTP verification failed",
            };
        }

        return {
            success: true,
            message: verification.message || "dashboard.done",
            data: {
                accountId: smtpAccount.id,
            },
        };
    });
}


export type UpdateSMTPAccountInput = {
    accountId: string;
    label?: string;
    ulid: string;
    required: Record<string, unknown>;
    optional?: Record<string, unknown>;
};

export async function updateSMTPAccount(
    input: UpdateSMTPAccountInput,
): Promise<FormState<{ accountId: string }>> {
    return handleAction(async () => {
        const session = await currentSession();
        const workspaceId = await getWorkspaceId();
        const rls = await rlsClient();

        const [smtpSecret] = await fetchDecryptedSecrets({
            linkTable: smtpAccountSecrets,
            foreignCol: smtpAccountSecrets.accountId,
            secretIdCol: smtpAccountSecrets.secretId,
            parentId: input.accountId,
        });

        if (!smtpSecret) {
            return {
                success: false,
                error: "SMTP account not found",
            };
        }

        const previousConfig = { ...smtpSecret.parsedSecret };

        const smtpConfig: Record<string, unknown> = {
            ulid: input.ulid,
            label: String(input.label || "My SMTP Account").trim(),
            ...input.required,
            ...input.optional,
        };

        await updateSecret(session, workspaceId, smtpSecret.metaId, {
            name: input.ulid,
            value: JSON.stringify(smtpConfig),
        });

        const verification = await verifySMTPAccount(input.accountId);

        if (!verification.success) {
            await updateSecret(session, workspaceId, smtpSecret.metaId, {
                name: String(previousConfig.ulid),
                value: JSON.stringify(previousConfig),
            });

            return {
                success: false,
                error:
                    verification.error ||
                    verification.message ||
                    "SMTP verification failed",
            };
        }

        return {
            success: true,
            message: verification.message || "dashboard.done",
            data: {
                accountId: input.accountId,
            },
        };
    });
}
