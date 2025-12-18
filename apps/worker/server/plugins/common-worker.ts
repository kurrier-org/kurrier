import { defineNitroPlugin } from "nitropack/runtime";
import {JobScheduler, Worker} from "bullmq";
import { getRedis } from "../../lib/get-redis";
import {db, mailboxThreads, MessageEntity, providers} from "@db";
import {PROVIDERS, STORAGE_PROVIDERS} from "@schema";
import { kvDel, kvGet, kvSet } from "@common";
import { processWebhook } from "../../lib/webhooks/message.received";
import {and, isNull, lte} from "drizzle-orm";

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
						.values([...PROVIDERS, ...STORAGE_PROVIDERS].map((k) => ({ type: k.key, ownerId: userId })))
						.onConflictDoNothing({
							target: [providers.ownerId, providers.type],
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
			console.log(
				`✅ Stored local tunnel URL: ${process.env.LOCAL_TUNNEL_URL}`,
			);
		} else {
			console.log(`ℹ️ Using existing tunnel URL from Redis: ${existing}`);
		}

		nitroApp.hooks.hookOnce("close", async () => {
			console.log("Closing common-worker tunnel");
            // try {
            //     await scheduler.removeJobScheduler("snooze-tick-scheduler");
            // } catch {}
		});
	} else {
		console.log("Local tunnel not enabled");
		await kvDel("local-tunnel-url");
        nitroApp.hooks.hookOnce("close", async () => {
            // try {
            //     await scheduler.removeJobScheduler("snooze-tick-scheduler");
            // } catch {}
        });
	}
});
