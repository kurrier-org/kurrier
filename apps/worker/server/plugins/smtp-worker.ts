import { defineNitroPlugin } from "nitropack/runtime";
import { ImapFlow } from "imapflow";

import { Worker } from "bullmq";
import { deltaFetch } from "../../lib/imap/imap-delta-fetch";
import { initSmtpClient } from "../../lib/imap/imap-client";
import { startBackfill } from "../../lib/imap/imap-backfill";
import { mailSetFlags } from "../../lib/imap/imap-flags";
import { moveMail } from "../../lib/imap/imap-move";

import { getRedis } from "../../lib/get-redis";
import { deleteMail } from "../../lib/imap/imap-delete";
import { backfillMailboxes } from "../../lib/imap/imap-backfill-mailboxes";
import { addNewFolder } from "../../lib/imap/imap-new-folder";
import { deleteFolder } from "../../lib/imap/imap-delete-folder";
import {imapIdleSync, startRealtimeForIdentity, stopRealtimeForIdentity} from "../../lib/imap/imap-idle-sync";

export default defineNitroPlugin(async (nitroApp) => {
	console.log("**********************SMTP-WORKER***************************");

	const imapInstances = new Map<string, ImapFlow>();
	const idleImapInstances = new Map<string, ImapFlow>();
	const connection = (await getRedis()).connection;
	const { searchIngestQueue } = await getRedis();

	const worker = new Worker(
		"smtp-worker",
		async (job) => {
			if (job.name === "delta-fetch") {
				const identityId = job.data.identityId;
				await deltaFetch(identityId, imapInstances);
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
			} else if (job.name === "backfill-mailboxes") {
				const identityId = job.data.identityId;
				const client = await initSmtpClient(identityId, imapInstances);
				if (client?.authenticated && client?.usable) {
					await backfillMailboxes(client, identityId);
				}
			} else if (job.name === "mailbox:add-new") {
				const identityId = job.data.identityId;
				const client = await initSmtpClient(identityId, imapInstances);
                if (client){
                    await addNewFolder(job.data, client);
                }
			} else if (job.name === "mailbox:delete-folder") {
				const identityId = job.data.identityId;
				const client = await initSmtpClient(identityId, imapInstances);
                if (client){
                    await deleteFolder(job.data, client);
                }
			} else if (job.name === "backfill") {
				const identityId = job.data.identityId;
				const client = await initSmtpClient(identityId, imapInstances);
				if (client?.authenticated && client?.usable) {
					await startBackfill(client, identityId);
				}
            } else if (job.name === "imap:start-idle") {
                const identityId = job.data.identityId as string;
                await startRealtimeForIdentity(identityId, idleImapInstances, imapInstances);
            } else if (job.name === "imap:stop-idle") {
                const identityId = job.data.identityId as string;
                await stopRealtimeForIdentity(identityId, idleImapInstances, imapInstances);
            }
			return { success: true };
		},
		{ connection },
	);

    await imapIdleSync(idleImapInstances, imapInstances)

	worker.on("completed", async (job) => {
		console.log(`${job.id} has completed!`);
	});

	worker.on("failed", (job, err) => {
		console.log(`${job?.id} has failed with ${err.message}`);
	});


	nitroApp.hooks.hookOnce("close", async () => {
		console.log("Closing nitro server...");
		try {
            const logoutAll = async (label: string, map: Map<string, ImapFlow>) => {
                for (const [identityId, client] of map) {
                    try {
                        await client.logout();
                        console.log(
                            `[${label}] Logged out from IMAP server for identityId: ${identityId}`
                        );
                    } catch (err) {
                        console.error(
                            `[${label}] Failed to logout cleanly for identityId: ${identityId}`,
                            err,
                        );
                    }
                }
                map.clear();
                console.log(`[${label}] IMAP map cleared`);
            };

            await logoutAll("command", imapInstances);
            await logoutAll("realtime", idleImapInstances);
			console.log("Logged out from IMAP server");
		} catch (err) {
			console.error("Failed to logout cleanly", err);
		}
		console.log("Task is done!");
	});
});
