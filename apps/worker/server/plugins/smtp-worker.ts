import { defineNitroPlugin } from "nitropack/runtime";
import { ImapFlow } from "imapflow";



import { JobScheduler, Worker } from "bullmq";
import { deltaFetch } from "../../lib/imap/imap-delta-fetch";
import { initSmtpClient } from "../../lib/imap/imap-client";
import { mailSetFlags } from "../../lib/imap/imap-flags";
import { moveMail } from "../../lib/imap/imap-move";

import {getRedis, redisConnection} from "../../lib/get-redis";
import { deleteMail } from "../../lib/imap/imap-delete";
import { addNewFolder } from "../../lib/imap/imap-new-folder";
import { deleteFolder } from "../../lib/imap/imap-delete-folder";
import {
	imapIdleSync,
	startRealtimeForIdentity,
	stopRealtimeForIdentity,
	beginRealtimeShutdown,
	recoverOfflineRealtime
} from "../../lib/imap/imap-idle-sync";
import { discoverMailboxes } from "../../lib/imap/backfill/discover/discover-mailboxes";
import {startBackfillForIdentity} from "../../lib/imap/backfill/backfill-full";
import {db, mailboxSync} from "@db";
import {eq, and, gt, or} from "drizzle-orm";
import { isGmailMailbox, isGmailThread } from "@common";
import { moveGmailMail } from "../../lib/gmail/gmail-move";
import { gmailSetFlags } from "../../lib/gmail/gmail-flags";

export default defineNitroPlugin(async (nitroApp) => {
	const imapInstances = new Map<string, ImapFlow>();
	const idleImapInstances = new Map<string, ImapFlow>();
	const { searchIngestQueue, smtpQueue } = await getRedis();
	const connection = redisConnection.connection

	const worker = new Worker(
		"smtp-worker",
		async (job) => {
			if (job.name === "delta-fetch") {
				const identityId = job.data.identityId;
				await deltaFetch(identityId, imapInstances);
				return { success: true };
			} else if (job.name === "mail:move") {
				if (job.data.op === "move" && !job.data.toMailboxId) {
					throw new Error("mail:move requires toMailboxId when op === 'move'");
				}

				const isGmail = await isGmailMailbox(job.data.mailboxId);

				if (isGmail) {
					await moveGmailMail(job.data);
				} else {
					await moveMail(job.data, imapInstances);
				}

				await searchIngestQueue.add(
					"refresh-thread",
					{ threadId: job.data.threadId },
					{
						jobId: `refresh-${job.data.threadId}`,
						removeOnComplete: true,
						removeOnFail: true,
						attempts: 3,
						backoff: { type: "exponential", delay: 1500 },
					},
				);
			} else if (job.name === "mail:set-flags") {
				const isGmail = await isGmailThread(job.data.threadId);

				if (isGmail) {
					await gmailSetFlags(job.data);
				} else {
					await mailSetFlags(job.data, imapInstances);
				}
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

			} else if (job.name === "imap:backfill-account") {
				const { identityId } = job.data as { identityId: string };

				const canContinue = await startBackfillForIdentity(
					identityId,
					imapInstances,
				);

				if (!canContinue) {
					console.info(
						`[IMAP] backfill paused identity=${identityId}`,
					);

					return { success: true };
				}

				const [remaining] = await db
					.select({ id: mailboxSync.id })
					.from(mailboxSync)
					.where(
						and(
							eq(mailboxSync.identityId, identityId),
							or(
								eq(mailboxSync.phase, "BACKFILL"),
								gt(mailboxSync.backfillCursorUid, 0),
							),
						),
					)
					.limit(1);

				if (remaining) {
					await smtpQueue.add(
						"imap:backfill-account",
						{ identityId },
						{
							jobId: `imap-backfill-account-${identityId}-${Date.now()}`,
							removeOnComplete: true,
							removeOnFail: true,
							delay: 1000,
						},
					);

					console.info(
						`[IMAP] backfill still pending; requeued identity=${identityId}`,
					);
				}

				return { success: true };

			} else if (job.name === "imap:resume-backfills") {

				const rows = await db
					.selectDistinct({
						identityId: mailboxSync.identityId,
					})
					.from(mailboxSync)
					.where(
						or(
							eq(mailboxSync.phase, "BACKFILL"),
							gt(mailboxSync.backfillCursorUid, 0),
						),
					);

				console.info(`[IMAP] resuming backfills for ${rows.length} identities`);

				for (const row of rows) {
					console.info(
						`[IMAP] queueing backfill resume identity=${row.identityId}`,
					);
					await smtpQueue.add(
						"imap:backfill-account",
						{ identityId: row.identityId },
						{
							removeOnComplete: true,
							removeOnFail: true,
							jobId: `imap-backfill-account-${row.identityId}`,
						},
					);
				}
				return { success: true };
			} else if (job.name === "imap:backfill-discover") {
				const identityId = job.data.identityId;
				const workspaceId = job.data.workspaceId;
				const client = await initSmtpClient(identityId, imapInstances);
				if (client?.authenticated && client?.usable) {
					await discoverMailboxes(client, identityId, workspaceId);
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
				void startRealtimeForIdentity(identityId, idleImapInstances, imapInstances).catch(
					(err) => console.error(`startRealtimeForIdentity failed ${identityId}`, err),
				);
			} else if (job.name === "imap:stop-idle") {
				const identityId = job.data.identityId as string;
				await stopRealtimeForIdentity(
					identityId,
					idleImapInstances,
					imapInstances,
				);
			} else if (job.name === "imap:realtime-recovery") {
				await recoverOfflineRealtime(
					idleImapInstances,
					imapInstances,
				);
				return { success: true };

			}
			return { success: true };
		},
		{
			connection,
			lockDuration: 5 * 60 * 1000,
		},
	);

	void imapIdleSync(idleImapInstances, imapInstances).catch((err) => {
		console.error("imapIdleSync failed", err);
	});

	const scheduler = new JobScheduler("smtp-worker", { connection });

	await scheduler.upsertJobScheduler(
		"imap-resume-backfills-scheduler",
		{ every: 24 * 60 * 60 * 1000 },
		"imap:resume-backfills",
		{},
		{
			removeOnComplete: true,
			removeOnFail: true,
			attempts: 1,
		},
		{ override: true },

	);

	await scheduler.upsertJobScheduler(
		"imap-realtime-recovery-scheduler",
		{ every: 10 * 60 * 1000 },
		"imap:realtime-recovery",
		{},
		{
			removeOnComplete: true,
			removeOnFail: true,
			attempts: 1,
		},
		{ override: true },
	);

	await smtpQueue.add(
		"imap:resume-backfills",
		{},
		{
			jobId:
				`imap-resume-backfills-startup-${Date.now()}`,
			removeOnComplete: true,
			removeOnFail: true,
		},
	);
	console.info(
		"[IMAP] startup backfill recovery queued",
	);

	worker.on("completed", async (job) => {
		console.info("job", job.name);
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

		beginRealtimeShutdown();
		try {
			const logoutAll = async (
				label: string,
				map: Map<string, ImapFlow>,
			) => {
				for (const [identityId, client] of map) {
					try {
						client.removeAllListeners();
						await client.logout();

						console.info(
							`[${label}] Logged out from IMAP server for identityId: ${identityId}`,
						);
					} catch (err) {
						console.warn(
							`[${label}] Failed to logout cleanly for identityId: ${identityId}`,
							err,
						);

						try {
							client.removeAllListeners();
							client.close();
						} catch {}
					}
				}

				map.clear();

				console.info(`[${label}] IMAP map cleared`);
			};

			await logoutAll("command", imapInstances);
			await logoutAll("realtime", idleImapInstances);
			console.info("Logged out from IMAP servers");
			try {
				await Promise.allSettled([
					worker?.close(),
					scheduler?.close(),
				]);
			} catch (err: any) {
				console.error("Error closing BullMQ resources:", err?.message ?? err);
			}

		} catch (err) {
			console.error("Failed to logout cleanly", err);
		}
		console.info("Task is done!");
	});
});
