import { defineNitroPlugin } from "nitropack/runtime";
import { ImapFlow } from "imapflow";

import {JobScheduler, Worker} from "bullmq";
import { deltaFetch } from "../../lib/imap/imap-delta-fetch";
import { initSmtpClient } from "../../lib/imap/imap-client";
import { mailSetFlags } from "../../lib/imap/imap-flags";
import { moveMail } from "../../lib/imap/imap-move";

import { getRedis } from "../../lib/get-redis";
import { deleteMail } from "../../lib/imap/imap-delete";
import { addNewFolder } from "../../lib/imap/imap-new-folder";
import { deleteFolder } from "../../lib/imap/imap-delete-folder";
import {
	imapIdleSync,
	startRealtimeForIdentity,
	stopRealtimeForIdentity,
} from "../../lib/imap/imap-idle-sync";
import { discoverMailboxes } from "../../lib/imap/backfill/discover/discover-mailboxes";
import { startFullBackfill } from "../../lib/imap/backfill/backfill-full";

export default defineNitroPlugin(async (nitroApp) => {
	console.log("**********************SMTP-WORKER***************************");

	const imapInstances = new Map<string, ImapFlow>();
	const idleImapInstances = new Map<string, ImapFlow>();
    const { connection, searchIngestQueue } = await getRedis();

	const worker = new Worker(
		"smtp-worker",
		async (job) => {
			if (job.name === "delta-fetch") {
				const identityId = job.data.identityId;
				await deltaFetch(identityId, imapInstances).catch((err) => {
                    console.error(`delta-fetch job failed for identityId ${identityId}:`, err);
                });
			} else if (job.name === "mail:move") {
				if (job.data.op === "move" && !job.data.toMailboxId) {
					throw new Error("mail:move requires toMailboxId when op === 'move'");
				}
				await moveMail(job.data, imapInstances);
				await searchIngestQueue.add(
					"refresh-thread",
					{ threadId: job.data.threadId },
					{
						jobId: `refresh-${job.data.threadId}`, // collapses duplicates
						removeOnComplete: true,
						removeOnFail: false,
						attempts: 3,
						backoff: { type: "exponential", delay: 1500 },
					},
				);
			} else if (job.name === "mail:set-flags") {
				await mailSetFlags(job.data, imapInstances);
				await searchIngestQueue.add(
					"refresh-thread",
					{ threadId: job.data.threadId },
					{
						jobId: `refresh-${job.data.threadId}`, // collapses duplicates
						removeOnComplete: true,
						removeOnFail: false,
						attempts: 3,
						backoff: { type: "exponential", delay: 1500 },
					},
				);
			} else if (job.name === "mail:delete-permanent") {
				await deleteMail(job.data, imapInstances);
			} else if (job.name === "smtp:append:sent") {


			} else if (job.name === "imap:backfill-tick") {
                console.info(`IMAP Backfill Tick triggered`);
                await startFullBackfill(imapInstances).catch((err) => {
                    console.error(`imap:backfill-tick job failed:`, err);
                })
                console.info("IMAP Backfill Tick completed");
                return { success: true };

			} else if (job.name === "imap:backfill-discover") {
                const identityId = job.data.identityId;
                const client = await initSmtpClient(identityId, imapInstances);
                if (client?.authenticated && client?.usable) {
                    await discoverMailboxes(client, identityId)
                }
			} else if (job.name === "mailbox:add-new") {
				const identityId = job.data.identityId;
				const client = await initSmtpClient(identityId, imapInstances);
				if (client) {
					await addNewFolder(job.data, client);
				}
			} else if (job.name === "mailbox:delete-folder") {
				const identityId = job.data.identityId;
				const client = await initSmtpClient(identityId, imapInstances);
				if (client) {
					await deleteFolder(job.data, client);
				}
			} else if (job.name === "imap:start-idle") {
				const identityId = job.data.identityId as string;
				await startRealtimeForIdentity(
					identityId,
					idleImapInstances,
					imapInstances,
				);
			} else if (job.name === "imap:stop-idle") {
				const identityId = job.data.identityId as string;
				await stopRealtimeForIdentity(
					identityId,
					idleImapInstances,
					imapInstances,
				);
			}
			return { success: true };
		},
		{ connection },
	);

	await imapIdleSync(idleImapInstances, imapInstances);


    const scheduler = new JobScheduler("smtp-worker", { connection });

    await scheduler.upsertJobScheduler(
        "imap-backfill-scheduler",
        { every: 120000 },
        "imap:backfill-tick",
        {},
        {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 1,
            backoff: { type: "fixed", delay: 5000 },
        },
        { override: true },
    );



	worker.on("completed", async (job) => {
        console.info("job", job.name)
		console.info(`[SMTP] ${job.id} has completed!`);
	});

	worker.on("failed", (job, err) => {
		console.info(`${job?.id} has failed with ${err.message}`);
	});
    worker.on("error", (err) => {
        console.info(`[SMTP] worker has failed with ${err.message}`);
    });

	nitroApp.hooks.hookOnce("close", async () => {
		console.info("Closing nitro server...");
		try {
			const logoutAll = async (label: string, map: Map<string, ImapFlow>) => {
				for (const [identityId, client] of map) {
					try {
						await client.logout();
						console.info(
							`[${label}] Logged out from IMAP server for identityId: ${identityId}`,
						);
					} catch (err) {
						console.error(
							`[${label}] Failed to logout cleanly for identityId: ${identityId}`,
							err,
						);
					}
				}
				map.clear();
				console.info(`[${label}] IMAP map cleared`);
			};

			await logoutAll("command", imapInstances);
			await logoutAll("realtime", idleImapInstances);
			console.info("Logged out from IMAP server");

            try {
                await scheduler.removeJobScheduler("imap-backfill-scheduler");
            } catch (err: any) {
                console.error(
                    "Error removing imap-backfill-scheduler:",
                    err?.message ?? err,
                );
            }

		} catch (err) {
			console.error("Failed to logout cleanly", err);
		}
		console.info("Task is done!");
	});
});
