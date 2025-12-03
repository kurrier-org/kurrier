import { JobScheduler, Worker } from "bullmq";
import { defineNitroPlugin } from "nitropack/runtime";
import { getRedis } from "../../lib/get-redis";
import { updatePassword } from "../../lib/dav/dav-update-password";
import { createContact } from "../../lib/dav/dav-create-contact";
import { updateContact } from "../../lib/dav/dav-update-contact";
import { deleteContact } from "../../lib/dav/dav-delete-contact";
import { seedAccount } from "../../lib/dav/dav-seed-account";
import { createAccount } from "../../lib/dav/dav-create-account";
import { davSyncDb } from "../../lib/dav/sync/dav-sync-db";
export default defineNitroPlugin(async (nitroApp) => {
	const { connection } = await getRedis();

	const worker = new Worker(
		"dav-worker",
		async (job) => {
			console.log(
				"[WORKER INSTANCE]",
				process.pid,
				"received job",
				job.name,
				job.id,
			);
			switch (job.name) {
				case "dav:create-account":
					return createAccount(job.data.userId);
				case "dav:seed-account":
					return seedAccount(job.data.userId);
				case "dav:update-password":
					return updatePassword(job.data.userId);
				case "dav:create-contact":
					return createContact(job.data.contactId, job.data.ownerId);
				case "dav:update-contact":
					return updateContact(job.data.contactId, job.data.ownerId);
				case "dav:create-contacts-batch": {
					const { ownerId, contactIds } = job.data;

					console.log(
						`[DAV WORKER] Processing contacts batch (${contactIds.length})`,
					);
					const results = [];
					for (const id of contactIds) {
						try {
							const r = await createContact(id, ownerId);
							results.push({ id, success: true, result: r });
						} catch (err: any) {
							results.push({
								id,
								success: false,
								error: err?.message ?? err,
							});
						}
					}

					return {
						ok: true,
						total: contactIds.length,
						results,
					};
				}
				case "dav:delete-contact":
					return deleteContact({
						contactId: job.data.contactId,
						ownerId: job.data.ownerId,
					});
				case "dav:sync":
					console.log("[DAV WORKER] Starting DAV sync job:", job.id);
					return davSyncDb();
				default:
					return { success: true, skipped: true };
			}
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.info(`DAV job ${job.id} (${job.name}) completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`DAV job ${job?.id} (${job?.name}) failed: ${err.message}`);
	});

	const scheduler = new JobScheduler("dav-worker", { connection });
	await scheduler.upsertJobScheduler(
		"dav-sync-scheduler",
		{ every: 60000 },
		"dav:sync",
		{},
		{
			removeOnComplete: true,
			removeOnFail: true,
		},
		{ override: true },
	);

	nitroApp.hooks.hookOnce("close", async () => {
		console.info("Closing nitro server...");
		console.info("Shutting down dav worker!");
		await scheduler.removeJobScheduler("dav-sync-scheduler");
		try {
			console.info("Removing dav-sync-scheduler...");
			await scheduler.removeJobScheduler("dav-sync-scheduler");
		} catch (err: any) {
			console.error("Error removing scheduler:", err?.message ?? err);
		}

		try {
			await worker.close();
		} catch (err: any) {
			console.error("Error closing BullMQ resources:", err?.message ?? err);
		}
	});
});
