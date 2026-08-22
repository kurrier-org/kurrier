import { defineNitroPlugin } from "nitropack/runtime";
import {
    JobScheduler,
    Worker,
} from "bullmq";

import { getRedis } from "../../lib/get-redis";

import {
    db,
    getSecretAdmin,
    jmapAccounts,
    mailboxes,
} from "@db";

import {
    and,
    eq,
} from "drizzle-orm";

import { JmapClient } from "@jmap";

import {
    syncJmapMailboxes,
} from "../../lib/jmap/jmap-sync-mailbox";

import {
    ingestJmapEmail,
} from "../../lib/jmap/jmap-ingest-email";

async function resolveJmapClient(
    identityId: string,
) {
    const [account] = await db
        .select()
        .from(jmapAccounts)
        .where(
            eq(
                jmapAccounts.identityId,
                identityId,
            ),
        )
        .limit(1);

    if (!account) {
        throw new Error(
            `JMAP account not found for identity ${identityId}`,
        );
    }

    const { vault } =
        await getSecretAdmin(
            account.tokenSecretId,
        );

    const client = new JmapClient(
        vault.decrypted_secret,
        account.sessionUrl,
    );

    return {
        client,
        account,
    };
}

async function getJmapMailboxes(
    identityId: string,
    workspaceId: string,
) {
    const rows = await db
        .select()
        .from(mailboxes)
        .where(
            and(
                eq(
                    mailboxes.identityId,
                    identityId,
                ),
                eq(
                    mailboxes.workspaceId,
                    workspaceId,
                ),
            ),
        );

    const byRemoteId =
        new Map<
            string,
            typeof mailboxes.$inferSelect
        >();

    for (const mailbox of rows) {
        const remoteMailboxId =
            (mailbox.metaData as any)
                ?.jmapMailboxId;

        if (!remoteMailboxId) {
            continue;
        }

        byRemoteId.set(
            String(remoteMailboxId),
            mailbox,
        );
    }

    return {
        rows,
        byRemoteId,
    };
}

export default defineNitroPlugin(
    async (nitroApp) => {
        console.info(
            "**********************JMAP-WORKER***************************",
        );

        const {
            connection,
            jmapQueue,
        } = await getRedis();

        const worker = new Worker(
            "jmap-worker",
            async (job) => {
                switch (job.name) {
                    case "jmap:backfill-discover": {
                        const {
                            identityId,
                            workspaceId,
                        } = job.data as {
                            identityId: string;
                            workspaceId: string;
                        };

                        const {
                            client,
                            account,
                        } =
                            await resolveJmapClient(
                                identityId,
                            );

                        const remote =
                            await client.getMailboxes(
                                account.accountId,
                            );

                        const result =
                            await syncJmapMailboxes({
                                identityId,
                                workspaceId,
                                remote,
                            });

                        console.info(
                            `[JMAP] Synced ${result.mailboxes.length} mailboxes for ${identityId}`,
                        );

                        return {
                            success: true,
                            identityId,
                            workspaceId,
                            mailboxes:
                            result.mailboxes.length,
                            state:
                            result.state,
                        };
                    }

                    case "jmap:backfill-account": {
                        const {
                            identityId,
                            workspaceId,
                        } = job.data as {
                            identityId: string;
                            workspaceId: string;
                        };

                        console.info(
                            `[JMAP] Starting account backfill for identity ${identityId}`,
                        );

                        const {
                            client,
                            account,
                        } =
                            await resolveJmapClient(
                                identityId,
                            );

                        const {
                            rows: localMailboxes,
                            byRemoteId:
                                localMailboxByRemoteId,
                        } =
                            await getJmapMailboxes(
                                identityId,
                                workspaceId,
                            );

                        const processedEmailIds =
                            new Set<string>();

                        let totalQueried = 0;
                        let totalFetched = 0;
                        let totalStored = 0;

                        let latestEmailState =
                            account.syncState
                                ?.email ?? null;

                        for (
                            const mailbox
                            of localMailboxes
                            ) {
                            const remoteMailboxId =
                                String(
                                    (
                                        mailbox.metaData as any
                                    )
                                        ?.jmapMailboxId ??
                                    "",
                                );

                            if (!remoteMailboxId) {
                                continue;
                            }

                            console.info(
                                `[JMAP] Querying mailbox ${mailbox.name} (${remoteMailboxId})`,
                            );

                            const query =
                                await client.queryEmails(
                                    account.accountId,
                                    remoteMailboxId,
                                );

                            totalQueried +=
                                query.ids.length;

                            console.info(
                                `[JMAP] ${query.ids.length} emails found in ${mailbox.name}`,
                            );

                            if (!query.ids.length) {
                                continue;
                            }

                            const batchSize = 100;

                            for (
                                let offset = 0;
                                offset <
                                query.ids.length;
                                offset +=
                                    batchSize
                            ) {
                                const ids =
                                    query.ids.slice(
                                        offset,
                                        offset +
                                        batchSize,
                                    );

                                const result =
                                    await client.getEmails(
                                        account.accountId,
                                        ids,
                                    );

                                totalFetched +=
                                    result.list.length;

                                latestEmailState =
                                    result.state;

                                for (
                                    const email
                                    of result.list
                                    ) {
                                    if (
                                        processedEmailIds.has(
                                            email.id,
                                        )
                                    ) {
                                        continue;
                                    }

                                    const ingest =
                                        await ingestJmapEmail(
                                            {
                                                client,
                                                account,
                                                workspaceId,
                                                email,
                                                localMailboxByRemoteId,
                                            },
                                        );

                                    if (
                                        ingest.stored
                                    ) {
                                        processedEmailIds.add(
                                            email.id,
                                        );

                                        totalStored += 1;

                                        console.info(
                                            `[JMAP] Stored ${email.id} in ${ingest.mailbox?.name}`,
                                        );
                                    }
                                }
                            }
                        }

                        if (latestEmailState) {
                            await db
                                .update(
                                    jmapAccounts,
                                )
                                .set({
                                    syncState: {
                                        ...(account.syncState ??
                                            {}),
                                        email:
                                        latestEmailState,
                                    },
                                    updatedAt:
                                        new Date(),
                                })
                                .where(
                                    eq(
                                        jmapAccounts.id,
                                        account.id,
                                    ),
                                );
                        }

                        console.info(
                            `[JMAP] Backfill complete for ${identityId}: ${totalStored} emails stored`,
                        );

                        return {
                            success: true,
                            identityId,
                            workspaceId,
                            totalQueried,
                            totalFetched,
                            totalStored,
                            emailState:
                            latestEmailState,
                        };
                    }

                    case "jmap:sync": {
                        const {
                            identityId,
                            workspaceId,
                        } = job.data as {
                            identityId: string;
                            workspaceId: string;
                        };

                        const {
                            client,
                            account,
                        } =
                            await resolveJmapClient(
                                identityId,
                            );

                        const sinceState =
                            account.syncState
                                ?.email;

                        if (!sinceState) {
                            console.info(
                                `[JMAP] No email sync state for ${identityId}; scheduling backfill`,
                            );

                            await jmapQueue.add(
                                "jmap:backfill-account",
                                {
                                    identityId,
                                    workspaceId,
                                },
                                {
                                    jobId:
                                        `jmap-backfill-account-${identityId}`,
                                    removeOnComplete:
                                        true,
                                    removeOnFail:
                                        true,
                                    attempts: 3,
                                    backoff: {
                                        type:
                                            "exponential",
                                        delay:
                                            1000,
                                    },
                                },
                            );

                            return {
                                success: true,
                                bootstrap: true,
                                identityId,
                                workspaceId,
                            };
                        }

                        const changes =
                            await client.changesEmails(
                                account.accountId,
                                sinceState,
                            );

                        const {
                            byRemoteId:
                                localMailboxByRemoteId,
                        } =
                            await getJmapMailboxes(
                                identityId,
                                workspaceId,
                            );

                        const changedIds =
                            Array.from(
                                new Set([
                                    ...changes.created,
                                    ...changes.updated,
                                ]),
                            );

                        let totalStored = 0;

                        if (
                            changedIds.length
                        ) {
                            const batchSize = 100;

                            for (
                                let offset = 0;
                                offset <
                                changedIds.length;
                                offset +=
                                    batchSize
                            ) {
                                const ids =
                                    changedIds.slice(
                                        offset,
                                        offset +
                                        batchSize,
                                    );

                                const result =
                                    await client.getEmails(
                                        account.accountId,
                                        ids,
                                    );

                                for (
                                    const email
                                    of result.list
                                    ) {
                                    const ingest =
                                        await ingestJmapEmail(
                                            {
                                                client,
                                                account,
                                                workspaceId,
                                                email,
                                                localMailboxByRemoteId,
                                            },
                                        );

                                    if (
                                        ingest.stored
                                    ) {
                                        totalStored +=
                                            1;

                                        console.info(
                                            `[JMAP] Synced ${email.id} into ${ingest.mailbox?.name}`,
                                        );
                                    }
                                }
                            }
                        }

                        await db
                            .update(
                                jmapAccounts,
                            )
                            .set({
                                syncState: {
                                    ...(account.syncState ??
                                        {}),
                                    email:
                                    changes.newState,
                                },
                                updatedAt:
                                    new Date(),
                            })
                            .where(
                                eq(
                                    jmapAccounts.id,
                                    account.id,
                                ),
                            );

                        console.info(
                            `[JMAP] Delta sync complete for ${identityId}: ${totalStored} emails stored`,
                        );

                        return {
                            success: true,
                            identityId,
                            workspaceId,
                            totalStored,
                            changes,
                        };
                    }

                    case "jmap:sync-all": {
                        const accounts =
                            await db
                                .select({
                                    identityId:
                                    jmapAccounts.identityId,
                                    workspaceId:
                                    jmapAccounts.workspaceId,
                                })
                                .from(
                                    jmapAccounts,
                                );

                        for (
                            const account
                            of accounts
                            ) {
                            if (
                                !account.identityId
                            ) {
                                continue;
                            }

                            await jmapQueue.add(
                                "jmap:sync",
                                {
                                    identityId:
                                    account.identityId,
                                    workspaceId:
                                    account.workspaceId,
                                },
                                {
                                    jobId:
                                        `jmap-sync-${account.identityId}`,
                                    removeOnComplete:
                                        true,
                                    removeOnFail:
                                        true,
                                    attempts: 3,
                                    backoff: {
                                        type:
                                            "exponential",
                                        delay:
                                            1000,
                                    },
                                },
                            );
                        }

                        return {
                            success: true,
                        };
                    }

                    default: {
                        console.warn(
                            `[JMAP] Unknown job: ${job.name}`,
                        );

                        return {
                            success: false,
                            message:
                                `Unknown JMAP job: ${job.name}`,
                        };
                    }
                }
            },
            {
                connection,
            },
        );

        const scheduler =
            new JobScheduler(
                "jmap-worker",
                {
                    connection,
                },
            );

        await scheduler.upsertJobScheduler(
            "jmap-sync-all-scheduler",
            {
                every:
                    60 * 1000,
            },
            "jmap:sync-all",
            {},
            {
                removeOnComplete:
                    true,
                removeOnFail:
                    true,
                attempts: 1,
            },
            {
                override: true,
            },
        );

        worker.on(
            "completed",
            (job) => {
                console.info(
                    `[JMAP] ${job.name} ${job.id} completed`,
                );
            },
        );

        worker.on(
            "failed",
            (job, err) => {
                console.error(
                    `[JMAP] ${job?.name} ${job?.id} failed`,
                    err,
                );
            },
        );

        worker.on(
            "error",
            (err) => {
                console.error(
                    `[JMAP] worker error: ${err.message}`,
                );
            },
        );

        nitroApp.hooks.hookOnce(
            "close",
            async () => {
                console.info(
                    "[JMAP] Closing worker...",
                );

                await Promise.allSettled([
                    worker.close(),
                    scheduler.close(),
                ]);
            },
        );
    },
);
