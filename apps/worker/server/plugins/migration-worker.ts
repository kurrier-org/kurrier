import { defineNitroPlugin } from "nitropack/runtime";
import {runMigrationsForWorkspace} from "../../lib/migrations/run-migration";
import { getRedis } from "../../lib/get-redis";
import { Worker } from "bullmq";

async function runAllUserMigrations() {
	const { connection } = await getRedis();
	const worker = new Worker(
		"migration-worker",
		async (job) => {
			switch (job.name) {
				case "migration:run-for-user-after-signup":
					return runMigrationsForWorkspace(job.data.userId, job.data.workspaceId, job.data.email);
				default:
					return { success: true, skipped: true };
			}
		},
		{ connection },
	);
	worker.on("completed", (job) => {
		console.info(`Migration job ${job.id} (${job.name}) completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(
			`Migration job ${job?.id} (${job?.name}) failed: ${err.message}`,
		);
	});
}

export default defineNitroPlugin(async () => {
	await runAllUserMigrations();
});
