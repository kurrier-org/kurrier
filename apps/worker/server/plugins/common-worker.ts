import { defineNitroPlugin } from "nitropack/runtime";
import { Worker } from "bullmq";
import { getRedis } from "../../lib/get-redis";
import { db, providers } from "@db";
import { PROVIDERS } from "@schema";
import { kvDel, kvGet, kvSet } from "@common";

export default defineNitroPlugin(async (nitroApp) => {
	const connection = (await getRedis()).connection;

	const worker = new Worker(
		"common-worker",
		async (job) => {
			switch (job.name) {
				case "sync-providers": {
					const { userId } = job.data as { userId: string };
					await db
						.insert(providers)
						.values(PROVIDERS.map((k) => ({ type: k.key, ownerId: userId })))
						.onConflictDoNothing({
							target: [providers.ownerId, providers.type],
						})
						.returning();
					return { success: true };
				}
				default:
					return { success: true };
			}
		},
		{ connection },
	);

	worker.on("completed", async (job) => {
		console.log(`${job.id} has completed!`);
	});

	worker.on("failed", (job, err) => {
		console.log(`${job?.id} has failed with ${err.message}`);
	});

	if (process.env.LOCAL_TUNNEL_URL) {
		const existing = await kvGet("local-tunnel-url");
		if (!existing || existing !== process.env.LOCAL_TUNNEL_URL) {
			await kvSet("local-tunnel-url", process.env.LOCAL_TUNNEL_URL);
			console.log(
				`✅ Stored local tunnel URL: ${process.env.LOCAL_TUNNEL_URL}`,
			);
		} else {
			console.log(`ℹ️ Using existing tunnel URL from Redis: ${existing}`);
		}

		nitroApp.hooks.hookOnce("close", async () => {
			console.log("Closing common-worker tunnel");
		});
	} else {
		console.log("Local tunnel not enabled");
		await kvDel("local-tunnel-url");
	}
});
