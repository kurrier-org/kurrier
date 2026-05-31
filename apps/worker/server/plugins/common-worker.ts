import { defineNitroPlugin } from "nitropack/runtime";
import { JobScheduler, Worker } from "bullmq";
import { getRedis } from "../../lib/get-redis";
import { db, mailboxThreads, MessageEntity, providers } from "@db";
import { PROVIDERS, STORAGE_PROVIDERS } from "@schema";
import { kvDel, kvGet, kvSet } from "@common";
import { processWebhook } from "../../lib/webhooks/message.received";
import { and, isNull, lte } from "drizzle-orm";
import { processRules } from "../../lib/rules/rules-processor";

export default defineNitroPlugin(async (nitroApp) => {
	const connection = (await getRedis()).connection;

	const worker = new Worker(
		"common-worker",
		async (job) => {
			switch (job.name) {
				case "sync-providers": {
					const { userId, workspaceId } = job.data as { userId: string, workspaceId: string };
					console.log("[COMMON WORKER] syncing providers for user, workspace", userId, workspaceId);
					await db
						.insert(providers)
						.values(
							[...PROVIDERS, ...STORAGE_PROVIDERS].map((k) => ({
								type: k.key,
								ownerId: userId,
								workspaceId: workspaceId,
							})),
						)
						.onConflictDoNothing({
							target: [providers.ownerId, providers.type, providers.workspaceId],
						})
						.returning();
					return { success: true };
				}
				case "webhook:message.received": {
					const { message, rawEmail } = job.data as {
						message: MessageEntity;
						rawEmail: string;
					};
					await processWebhook({ message, rawEmail });
					return { success: true };
				}
				case "rules:processor": {
					const { messageId } = job.data as {
						messageId: string;
					};
					await processRules({ messageId });
					return { success: true };
				}
				case "mail:snooze-tick": {
					const now = new Date();
					await db
						.update(mailboxThreads)
						.set({
							snoozedUntil: null,
							unsnoozedAt: now,
							updatedAt: now,
						})
						.where(
							and(
								lte(mailboxThreads.snoozedUntil, now),
								isNull(mailboxThreads.unsnoozedAt),
							),
						);

					return { success: true };
				}
				default:
					return { success: true };
			}
		},
		{ connection },
	);

	const scheduler = new JobScheduler("common-worker", { connection });

	await scheduler.upsertJobScheduler(
		"snooze-tick-scheduler",
		{ every: 60000 },
		"mail:snooze-tick",
		{},
		{
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 1,
		},
		{ override: true },
	);


	await scheduler.upsertJobScheduler(
		"billing-sync-scheduler",
		// { every: 10000 },
		{ every: 60 * 60 * 1000 },
		"billing:sync",
		{},
		{
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 1,
		},
		{ override: true },
	);

	worker.on("completed", async (job) => {
		console.log(`[COMMON] ${job.name} ${job.id} has completed!`);
	});

	worker.on("failed", (job, err) => {
		console.log(`${job?.id} has failed with ${err.message}`);
	});

	if (process.env.LOCAL_TUNNEL_URL) {
		const existing = await kvGet("local-tunnel-url");
		if (!existing || existing !== process.env.LOCAL_TUNNEL_URL) {
			await kvSet("local-tunnel-url", process.env.LOCAL_TUNNEL_URL);
			console.info(
				`✅ Stored local tunnel URL: ${process.env.LOCAL_TUNNEL_URL}`,
			);
		} else {
			console.info(`ℹ️ Using existing tunnel URL from Redis: ${existing}`);
		}

		nitroApp.hooks.hookOnce("close", async () => {
			console.info("Closing common-worker tunnel");
		});
	} else {
		console.info("Local tunnel not enabled");
		await kvDel("local-tunnel-url");
		nitroApp.hooks.hookOnce("close", async () => {
			try {
				await Promise.allSettled([
					worker?.close(),
					scheduler?.close(),
				]);
			} catch (err: any) {
				console.error("Error closing BullMQ resources:", err?.message ?? err);
			}
		});
	}
});
