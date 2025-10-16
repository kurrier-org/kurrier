import { defineNitroPlugin } from "nitropack/runtime";
import { Worker } from "bullmq";
import { getRedis } from "../../lib/get-redis";
import {db, providers} from "@db";
import {PROVIDERS} from "@schema";

export default defineNitroPlugin(async () => {
    const connection = (await getRedis()).connection;

    const worker = new Worker(
        "common-worker",
        async (job) => {
            switch (job.name) {
                case "sync-providers": {
                    const { userId } = job.data as { userId: string };
                     await db.insert(providers)
                        .values(PROVIDERS.map((k) => ({ type: k.key, ownerId: userId })))
                        .onConflictDoNothing({ target: [providers.ownerId, providers.type] })
                        .returning()
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

});
