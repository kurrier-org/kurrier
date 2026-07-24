import { defineNitroPlugin } from "nitropack/runtime";
import { JobScheduler, Worker } from "bullmq";
import { sql } from "drizzle-orm";

import {
    db, identities
} from "@db";
import { getRedis } from "../../lib/get-redis";
import { discoverGmailMailboxes } from "../../lib/gmail/gmail-discover";
import { backfillGmailAccount } from "../../lib/gmail/gmail-backfill";
import { deltaSyncGmailAccount } from "../../lib/gmail/gmail-delta";
import {
    addGmailLabelToThread,
    createGmailLabel,
    deleteGmailLabel, removeGmailLabelFromThread,
    updateGmailLabel
} from "../../lib/gmail/gmail-lablels";



async function enqueueDeltaSyncForAllGoogleIdentities() {
    const { gmailQueue } = await getRedis();

    const rows = await db
        .select({
            identityId: identities.id,
            workspaceId: identities.workspaceId,
        })
        .from(identities)
        .where(
            sql`${identities.metaData}->'gmail'->>'googleAccountId' is not null`,
        );

    let queued = 0;

    for (const row of rows) {
        await gmailQueue.add(
            "gmail:delta-sync",
            {
                identityId: row.identityId,
                workspaceId: row.workspaceId,
            },
            {
                jobId: `gmail-delta-sync-${row.identityId}`,
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            },
        );

        queued++;
    }

    console.info(`[GMAIL] Queued delta sync for ${queued} Google identities`);
}


async function enqueueIncompleteBackfills() {
    const { gmailQueue } = await getRedis();

    const rows = await db
        .select({
            identityId: identities.id,
            workspaceId: identities.workspaceId,
            metaData: identities.metaData,
        })
        .from(identities)
        .where(
            sql`${identities.metaData}->'gmail'->>'googleAccountId' is not null`,
        );

    let queued = 0;

    for (const row of rows) {
        const gmailMeta = (row.metaData as any)?.gmail ?? {};

        if (gmailMeta.backfillCompleted) {
            continue;
        }

        await gmailQueue.add(
            "gmail:backfill-account",
            {
                identityId: row.identityId,
                workspaceId: row.workspaceId,
                pageToken:
                    gmailMeta.backfill?.currentPageToken ?? undefined,
            },
            {
                jobId: `gmail-backfill-resume-${row.identityId}`,
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            },
        );

        queued++;
    }

    console.info(
        `[GMAIL] Queued ${queued} incomplete Gmail backfills`,
    );
}

export default defineNitroPlugin(async (nitroApp) => {
    console.info("**********************GMAIL-WORKER***************************");

    const { connection } = await getRedis();

    const worker = new Worker(
        "gmail-worker",
        async (job) => {
            if (
                job.name === "gmail:backfill-discover" ||
                job.name === "gmail:backfill-account" ||
                job.name === "gmail:delta-sync"
            ) {

                if (job.name === "gmail:backfill-discover") {
                    await discoverGmailMailboxes(job);
                }

                if (job.name === "gmail:backfill-account") {
                    await backfillGmailAccount(job);
                }

                if (job.name === "gmail:delta-sync") {
                    await deltaSyncGmailAccount(job);
                }
            }

            if (job.name === "gmail:delta-sync-all") {
                await enqueueDeltaSyncForAllGoogleIdentities();
            }

            if (job.name === "gmail:resume-backfills") {
                await enqueueIncompleteBackfills();
            }

            if (job.name === "gmail:label:create") {
                await createGmailLabel(job.data);
            }

            if (job.name === "gmail:label:update") {
                await updateGmailLabel(job.data);
            }

            if (job.name === "gmail:label:delete") {
                await deleteGmailLabel(job.data);
            }

            if (job.name === "gmail:thread-label:add") {
                await addGmailLabelToThread(job.data);
            }

            if (job.name === "gmail:thread-label:remove") {
                await removeGmailLabelFromThread(job.data);
            }

            return { success: true };
        },
        { connection },
    );

    const scheduler = new JobScheduler("gmail-worker", { connection });

    await scheduler.upsertJobScheduler(
        "gmail-delta-sync-all-scheduler",
        { every: 5 * 60 * 1000 },
        "gmail:delta-sync-all",
        {},
        {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 1,
            backoff: {
                type: "fixed",
                delay: 5000,
            },
        },
        { override: true },
    );

    await scheduler.upsertJobScheduler(
        "gmail-resume-backfills-scheduler",
        { every: 24 * 60 * 60 * 1000 },
        "gmail:resume-backfills",
        {},
        {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 1,
        },
        { override: true },
    );

    worker.on("completed", async (job) => {
        console.info(`[GMAIL] ${job.name} ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[GMAIL] ${job?.name} ${job?.id} failed`, err);
    });

    worker.on("error", (err) => {
        console.error(`[GMAIL] worker error: ${err.message}`);
    });

    nitroApp.hooks.hookOnce("close", async () => {
        console.info("[GMAIL] Closing worker...");
        await Promise.allSettled([
            worker.close(),
            scheduler.close(),
        ]);
    });
});
