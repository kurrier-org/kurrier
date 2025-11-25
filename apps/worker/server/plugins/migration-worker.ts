import { defineNitroPlugin } from "nitropack/runtime";
import { db, appMigrations } from "@db";
import { authUsers } from "drizzle-orm/supabase";
import { desc, eq } from "drizzle-orm";
import { kvGet, kvSet, APP_VERSION } from "@common";
import { runMigrationsForUser } from "../../lib/migrations/run-migration";
import { getRedis } from "../../lib/get-redis";
import { Worker } from "bullmq";

const isProd = process.env.NODE_ENV === "production";

async function runAllUserMigrations() {
	const { connection } = await getRedis();
	const worker = new Worker(
		"migration-worker",
		async (job) => {
			switch (job.name) {
				case "migration:run-for-user-after-signup":
					return runMigrationsForUser(job.data.userId);
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

	console.log("Starting per-user migrations…");
	const users = await db.select().from(authUsers);

	for (const user of users) {
		const userId = user.id;
		const toVersion = APP_VERSION;
		const cacheKey = `app-migrations:last:${userId}`;

		try {
			if (isProd) {
				const cached = (await kvGet<string | null>(cacheKey)) ?? null;
				if (cached === toVersion) {
					console.log(`User ${userId}: already at ${toVersion} (redis)`);
					continue;
				}
			}

			const last = await db
				.select()
				.from(appMigrations)
				.where(eq(appMigrations.ownerId, userId))
				.orderBy(desc(appMigrations.version))
				.limit(1);

			const fromVersion = last.length > 0 ? last[0].version : null;

			if (fromVersion === toVersion) {
				console.log(`User ${userId}: already at ${toVersion} (db)`);
				if (isProd) await kvSet(cacheKey, toVersion);
				continue;
			}

			console.log(
				`Migrating user ${userId} from ${fromVersion ?? "null"} → ${toVersion}`,
			);

			await runMigrationsForUser(userId, fromVersion, toVersion);

			if (isProd) {
				await kvSet(cacheKey, toVersion);
			}

			console.log(`User ${userId}: migrated to ${toVersion}`);
		} catch (err) {
			console.error(`Migration failed for user ${userId}`, err);
			throw err;
		}
	}

	console.log("🎉 All user migrations done.");
}

export default defineNitroPlugin(async () => {
	await runAllUserMigrations();
});
