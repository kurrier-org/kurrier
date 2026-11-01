import { defineNitroPlugin } from "nitropack/runtime";
import { ImapFlow } from "imapflow";
import { JobScheduler, Worker } from "bullmq";
import { deltaFetch } from "../../lib/imap/imap-delta-fetch";
import { initSmtpClient } from "../../lib/imap/imap-client";
import { getRedis, redisConnection } from "../../lib/get-redis";
import {
	imapIdleSync,
	startRealtimeForIdentity,
	stopRealtimeForIdentity,
	beginRealtimeShutdown,
	recoverOfflineRealtime,
} from "../../lib/imap/imap-idle-sync";
import { discoverMailboxes } from "../../lib/imap/backfill/discover/discover-mailboxes";
import { startBackfillForIdentity } from "../../lib/imap/backfill/backfill-full";
import { db, identities, mailboxes, mailboxSync, messages, providers } from "@db";
import { eq, and, gt, or, inArray, isNotNull, sql } from "drizzle-orm";
import { isGmailMailbox, isGmailThread, s3 } from "@common";
import { moveGmailMail } from "../../lib/gmail/gmail-move";
import { gmailSetFlags } from "../../lib/gmail/gmail-flags";
import { canSyncIdentity } from "../../lib/access";
import { MailboxService } from "@providers";
import { pollImapFolders } from "../../lib/imap/imap-folder-poll";
import { kurrierServer } from "@distribution/kurrier-server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getServerEnv } from "@schema";

export default defineNitroPlugin(async (nitroApp) => {
	const imapInstances = new Map<string, ImapFlow>();
	const interactiveImapInstances = new Map<string, ImapFlow>();
	const idleImapInstances = new Map<string, ImapFlow>();
	const discoveryImapInstances = new Map<string, ImapFlow>();
	const backfillImapInstances = new Map<string, ImapFlow>();

	const {
		searchIngestQueue,
		smtpQueue,
		imapBackfillQueue,
	} = await getRedis();

	const connection = redisConnection.connection;

	const closeBackfillClient = async (identityId: string) => {
		const client = backfillImapInstances.get(identityId);
		if (!client) return;

		backfillImapInstances.delete(identityId);
		client.removeAllListeners();

		try {
			await client.logout();
		} catch {
			client.close();
		}
	};

	const discoveryWorker = new Worker(
		"imap-discovery",
		async (job) => {
			if (job.name !== "imap:backfill-discover") {
				throw new Error(`Unknown discovery job: ${job.name}`);
			}

			const { identityId, workspaceId } = job.data;

			if (!(await canSyncIdentity(identityId))) {
				return { success: true };
			}

			const client = await initSmtpClient(
				identityId,
				discoveryImapInstances,
			);

			if (!client?.authenticated || !client?.usable) {
				throw new Error(`IMAP unavailable: ${identityId}`);
			}

			try {
				await discoverMailboxes(client, identityId, workspaceId);
			} finally {
				discoveryImapInstances.delete(identityId);
				client.removeAllListeners();
				client.close();
			}

			return { success: true };
		},
		{
			connection,
			concurrency: 3,
			lockDuration: 5 * 60 * 1000,
		},
	);

	const backfillWorker = new Worker(
		"imap-backfill",
		async (job) => {
			if (job.name !== "imap:backfill-account") {
				throw new Error(`Unknown backfill job: ${job.name}`);
			}

			const { identityId } = job.data;

			if (!(await canSyncIdentity(identityId))) {
				await closeBackfillClient(identityId);
				return { success: true };
			}

			let canContinue: boolean;

			try {
				canContinue = await startBackfillForIdentity(
					identityId,
					backfillImapInstances,
				);
			} catch (err) {
				await closeBackfillClient(identityId);
				throw err;
			}

			if (!canContinue) {
				await closeBackfillClient(identityId);
				return { success: true };
			}

			try {
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
					await imapBackfillQueue.add(
						"imap:backfill-account",
						{ identityId },
						{
							jobId: `imap-backfill-account-${identityId}-${Date.now()}`,
							removeOnComplete: true,
							removeOnFail: true,
							delay: 1000,
						},
					);
				} else {
					await closeBackfillClient(identityId);
				}
			} catch (err) {
				await closeBackfillClient(identityId);
				throw err;
			}


			return { success: true };
		},
		{
			connection,
			concurrency: 1,
			lockDuration: 5 * 60 * 1000,
		},
	);

	const interactiveWorker = new Worker(
		"mail-interactive",
		async (job) => {
			if (job.name === "mail:move") {
				if (job.data.op === "move" && !job.data.toMailboxId) {
					throw new Error("mail:move requires toMailboxId when op === 'move'");
				}

				const isGmail = await isGmailMailbox(job.data.mailboxId);

				if (isGmail) {
					await moveGmailMail(job.data);
				} else {
					await MailboxService.moveMessages(job.data, {
						getIdentity: async (identityId) => {
							const [row] = await db
								.select({
									smtpAccountId: identities.smtpAccountId,
									providerType: providers.type,
									metaData: identities.metaData,
								})
								.from(identities)
								.leftJoin(providers, eq(identities.providerId, providers.id))
								.where(eq(identities.id, identityId))
								.limit(1);

							return row ?? null;
						},
						getImapClient: (identityId) =>
							initSmtpClient(identityId, interactiveImapInstances),
					});
				}

				await searchIngestQueue.add(
					"refresh-thread",
					{ threadId: job.data.threadId },
					{
						removeOnComplete: true,
						removeOnFail: false,
						attempts: 3,
						backoff: { type: "exponential", delay: 1500 },
					},
				);
			} else if (job.name === "mail:set-flags") {
				const isGmail = await isGmailThread(job.data.threadId);

				if (isGmail) {
					await gmailSetFlags(job.data);
				} else {
					await MailboxService.setFlags(job.data, {
						getIdentity: async (identityId) => {
							const [row] = await db
								.select({
									smtpAccountId: identities.smtpAccountId,
									providerType: providers.type,
									metaData: identities.metaData,
								})
								.from(identities)
								.leftJoin(providers, eq(identities.providerId, providers.id))
								.where(eq(identities.id, identityId))
								.limit(1);

							return row ?? null;
						},
						getImapClient: (identityId) =>
							initSmtpClient(identityId, interactiveImapInstances),
					});
				}

				await searchIngestQueue.add(
					"refresh-thread",
					{ threadId: job.data.threadId },
					{
						removeOnComplete: true,
						removeOnFail: false,
						attempts: 3,
						backoff: { type: "exponential", delay: 1500 },
					},
				);
			} else if (job.name === "mail:delete-permanent") {
				const affectedThreadIds = await MailboxService.deleteMessages(
					{
						mailboxId: job.data.mailboxId,
						threadIds: job.data.threadId
							? Array.isArray(job.data.threadId)
								? job.data.threadId
								: [job.data.threadId]
							: undefined,
						emptyAll: job.data.emptyAll,
					},
					{
						getIdentity: async (identityId) => {
							const [identity] = await db
								.select({
									smtpAccountId: identities.smtpAccountId,
									providerType: providers.type,
									metaData: identities.metaData,
								})
								.from(identities)
								.leftJoin(providers, eq(identities.providerId, providers.id))
								.where(eq(identities.id, identityId))
								.limit(1);

							return identity ?? null;
						},
						getImapClient: (identityId) =>
							initSmtpClient(identityId, interactiveImapInstances),
					},
				);

				await Promise.all(
					affectedThreadIds.map((threadId) =>
						searchIngestQueue.add(
							"refresh-thread",
							{ threadId },
							{
								removeOnComplete: true,
								removeOnFail: false,
								attempts: 3,
								backoff: { type: "exponential", delay: 1500 },
							},
						),
					),
				);
			} else if (job.name === "mailbox:add-new") {
				await MailboxService.createFolder(
					{
						identityId: job.data.identityId,
						name: job.data.name,
						parentId: job.data.parentId === "none"
							? null
							: job.data.parentId ?? null,
					},
					{
						getIdentity: async (identityId) => {
							const [row] = await db
								.select({
									smtpAccountId: identities.smtpAccountId,
									providerType: providers.type,
									metaData: identities.metaData,
								})
								.from(identities)
								.leftJoin(providers, eq(identities.providerId, providers.id))
								.where(eq(identities.id, identityId))
								.limit(1);

							return row ?? null;
						},
						getImapClient: (identityId) =>
							initSmtpClient(identityId, interactiveImapInstances),
					},
				);
			} else if (job.name === "mailbox:delete-folder") {
				await MailboxService.deleteFolder(
					{
						mailboxId: job.data.mailboxId,
						identityId: job.data.identityId,
					},
					{
						getIdentity: async (identityId) => {
							const [row] = await db
								.select({
									smtpAccountId: identities.smtpAccountId,
									providerType: providers.type,
									metaData: identities.metaData,
								})
								.from(identities)
								.leftJoin(providers, eq(identities.providerId, providers.id))
								.where(eq(identities.id, identityId))
								.limit(1);

							return row ?? null;
						},
						getImapClient: (identityId) =>
							initSmtpClient(identityId, interactiveImapInstances),
					},
				);
			} else {
				throw new Error(`Unknown interactive job: ${job.name}`);
			}

			return { success: true };
		},
		{
			connection,
			concurrency: 5,
			lockDuration: 5 * 60 * 1000,
		},
	);

	const worker = new Worker(
		"smtp-worker",
		async (job) => {
			if (job.name === "delta-fetch") {
				const identityId = job.data.identityId;

				if (!(await canSyncIdentity(identityId))) {
					console.info(
						`[SMTP] delta fetch disabled identity=${identityId}`,
					);
					return { success: true };
				}

				await deltaFetch(identityId, imapInstances, {
					reconcile: job.data.reconcile === true,
				});

				return { success: true };
			} else if (job.name === "imap:append-sent") {
				const { messageId } = job.data as { messageId: string };

				const [row] = await db
					.select({
						message: messages,
						mailbox: mailboxes,
					})
					.from(messages)
					.innerJoin(mailboxes, eq(messages.mailboxId, mailboxes.id))
					.where(eq(messages.id, messageId))
					.limit(1);

				if (!row) {
					throw new Error(`Message not found: ${messageId}`);
				}

				if (row.mailbox.kind !== "sent" || !row.message.rawStorageKey) {
					throw new Error(`Invalid Sent message: ${messageId}`);
				}

				const identityId = row.mailbox.identityId;

				const client = await initSmtpClient(
					identityId,
					interactiveImapInstances,
				);

				if (!client?.authenticated || !client?.usable) {
					throw new Error(`IMAP unavailable: ${identityId}`);
				}

				const path = String(
					(row.mailbox.metaData as any)?.imap?.path ?? row.mailbox.name,
				);

				const lock = await client.getMailboxLock(path);

				try {
					const existing = await client.search(
						{ header: { "Message-ID": row.message.messageId } },
						{ uid: true },
					);

					let uid: number | undefined = existing ? existing[0] : undefined;

					if (!uid) {
						const response = await s3.send(
							new GetObjectCommand({
								Bucket: getServerEnv().S3_BUCKET,
								Key: row.message.rawStorageKey,
							}),
						);

						if (!response.Body) {
							throw new Error(`EML not found: ${messageId}`);
						}

						const eml = Buffer.from(
							await response.Body.transformToByteArray(),
						);

						const result = await client.append(path, eml, ["\\Seen"]);

						if (!result) {
							throw new Error(`IMAP APPEND failed: ${messageId}`);
						}

						uid = result.uid;
					}

					if (uid) {
						await db
							.update(messages)
							.set({
								metaData: {
									...((row.message.metaData as Record<string, any>) ?? {}),
									imap: {
										...((row.message.metaData as any)?.imap ?? {}),
										uid,
										mailboxPath: path,
										flags: ["\\Seen"],
									},
								},
								updatedAt: new Date(),
							})
							.where(eq(messages.id, messageId));
					}
				} finally {
					lock.release();
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

				console.info(
					`[IMAP] resuming backfills for ${rows.length} identities`,
				);

				for (const row of rows) {
					console.info(
						`[IMAP] queueing backfill resume identity=${row.identityId}`,
					);

					await imapBackfillQueue.add(
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
			} else if (job.name === "imap:start-idle") {
				const identityId = job.data.identityId as string;

				void startRealtimeForIdentity(
					identityId,
					idleImapInstances,
					imapInstances,
				).catch((err) =>
					console.error(
						`startRealtimeForIdentity failed ${identityId}`,
						err,
					),
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
			} else if (
				job.name === "imap:delta-poll" ||
				job.name === "imap:reconcile-poll"
			) {
				const reconcile = job.name === "imap:reconcile-poll";

				const identityRows = await db
					.select({ id: identities.id })
					.from(identities)
					.where(
						or(
							isNotNull(identities.smtpAccountId),
							sql`${identities.metaData}->>'provider' = 'microsoft'`,
						),
					);

				const hostedIdentityIds =
					await kurrierServer.hooks.run("imap.listIdentities", {}) ?? [];

				const identityIds = new Set([
					...identityRows.map((row) => row.id),
					...hostedIdentityIds,
				]);

				for (const identityId of identityIds) {
					if (!(await canSyncIdentity(identityId))) {
						continue;
					}

					await smtpQueue.add(
						"delta-fetch",
						{ identityId, reconcile },
						{
							jobId: `imap-${reconcile ? "reconcile" : "delta"}-${identityId}`,
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}

				return { success: true };
			} else if (job.name === "imap:folder-poll") {
				const identityRows = await db
					.select({
						id: identities.id,
						workspaceId: identities.workspaceId,
					})
					.from(identities)
					.where(
						or(
							isNotNull(identities.smtpAccountId),
							sql`${identities.metaData}->>'provider' = 'microsoft'`,
						),
					);

				const hostedIdentityIds =
					await kurrierServer.hooks.run("imap.listIdentities", {}) ?? [];

				const identityMap = new Map(
					identityRows.map((identity) => [
						identity.id,
						identity.workspaceId,
					]),
				);

				if (hostedIdentityIds.length) {
					const hostedRows = await db
						.select({
							id: identities.id,
							workspaceId: identities.workspaceId,
						})
						.from(identities)
						.where(inArray(identities.id, hostedIdentityIds));

					for (const identity of hostedRows) {
						identityMap.set(identity.id, identity.workspaceId);
					}
				}

				for (const [identityId, workspaceId] of identityMap) {
					if (!(await canSyncIdentity(identityId))) {
						continue;
					}

					try {
						await pollImapFolders(
							identityId,
							workspaceId,
							imapInstances,
						);
					} catch (err) {
						console.error(
							`[IMAP] folder polling failed identity=${identityId}`,
							err,
						);
					}
				}

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
		"imap-delta-poll-scheduler",
		{ every: 5 * 60 * 1000 },
		"imap:delta-poll",
		{},
		{
			removeOnComplete: true,
			removeOnFail: true,
			attempts: 1,
		},
		{ override: true },
	);

	await scheduler.upsertJobScheduler(
		"imap-reconcile-poll-scheduler",
		{ every: 30 * 60 * 1000 },
		"imap:reconcile-poll",
		{},
		{
			removeOnComplete: true,
			removeOnFail: true,
			attempts: 1,
		},
		{ override: true },
	);

	await scheduler.upsertJobScheduler(
		"imap-folder-poll-scheduler",
		{ every: 20 * 60 * 1000 },
		"imap:folder-poll",
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
			jobId: `imap-resume-backfills-startup-${Date.now()}`,
			removeOnComplete: true,
			removeOnFail: true,
		},
	);

	worker.on("completed", (job) => {
		console.info(`[SMTP] ${job.name} ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[SMTP] ${job?.name} ${job?.id} failed`, err);
	});

	worker.on("error", (err) => {
		console.error("[SMTP] worker error", err);
	});

	interactiveWorker.on("completed", (job) => {
		console.info(`[MAIL] ${job.name} ${job.id} completed`);
	});

	interactiveWorker.on("failed", (job, err) => {
		console.error(`[MAIL] ${job?.name} ${job?.id} failed`, err);
	});

	interactiveWorker.on("error", (err) => {
		console.error("[MAIL] interactive worker error", err);
	});

	discoveryWorker.on("failed", (job, err) => {
		console.error(`[IMAP DISCOVERY] ${job?.id} failed`, err);
	});

	discoveryWorker.on("error", (err) => {
		console.error("[IMAP DISCOVERY] worker error", err);
	});

	backfillWorker.on("failed", (job, err) => {
		console.error(`[IMAP BACKFILL] ${job?.id} failed`, err);
	});

	backfillWorker.on("error", (err) => {
		console.error("[IMAP BACKFILL] worker error", err);
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

			await Promise.allSettled([
				worker.close(),
				interactiveWorker.close(),
				scheduler.close(),
				discoveryWorker.close(),
				backfillWorker.close(),
			]);

			await logoutAll("command", imapInstances);
			await logoutAll("realtime", idleImapInstances);
			await logoutAll("interactive", interactiveImapInstances);
			await logoutAll("discovery", discoveryImapInstances);
			await logoutAll("backfill", backfillImapInstances);

			console.info("Logged out from IMAP servers");
		} catch (err) {
			console.error("Failed to logout cleanly", err);
		}

		console.info("Task is done!");
	});
});
