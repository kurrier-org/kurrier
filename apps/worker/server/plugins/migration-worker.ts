import { Worker } from "bullmq";
import { defineNitroPlugin } from "nitropack/runtime";
import { getRedis } from "../../lib/get-redis";
import { runMigrationsForUser } from "../../lib/migrations/run-migration";
import { appMigrations, db } from "@db";
import { desc, eq } from "drizzle-orm";
import { kvGet, kvSet } from "@common";

const isProd = process.env.NODE_ENV === "production";

export default defineNitroPlugin(async () => {
	const { connection } = await getRedis();

	const worker = new Worker(
		"migration-worker",
		async (job) => {
			console.info("Processing job:", job.name, job.data);
			if (job.name !== "migration:run-for-user") {
				return { success: true };
			}

			const { userId, toVersion } = job.data as {
				userId: string;
				toVersion: string;
			};

			const cacheKey = `app-migrations:last:${userId}`;

			if (isProd) {
				const cached = (await kvGet<string | null>(cacheKey)) ?? null;
				if (cached === toVersion) {
					return { success: true, skipped: true, source: "redis" };
				}
			}

			const last = await db
				.select()
				.from(appMigrations)
				.where(eq(appMigrations.ownerId, userId))
				.orderBy(desc(appMigrations.version))
				.limit(1);

			const fromVersion: string | null =
				last.length > 0 ? last[0].version : null;
			if (fromVersion === toVersion) {
				if (isProd) {
					await kvSet(cacheKey, toVersion);
				}
				return { success: true, skipped: true, source: "db" };
			}
			await runMigrationsForUser(userId, fromVersion, toVersion);
			if (isProd) {
				await kvSet(cacheKey, toVersion);
			}

			return {
				success: true,
				migratedFrom: fromVersion,
				migratedTo: toVersion,
			};
		},
		{ connection },
	);

	worker.on("completed", (job) => {
		console.log(`Migration ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`Migration ${job?.id} failed: ${err.message}`);
	});
});
