import { defineNitroPlugin } from "nitropack/runtime";
import { Worker } from "bullmq";
import { redisConnection } from "@common";
import { kurrierServer } from "@distribution/kurrier-server";

export default defineNitroPlugin(async (nitroApp) => {
    const extensions = kurrierServer.workers.get();

    const workers = extensions.map((extension) => {
        const worker = new Worker(
            extension.queue,
            extension.handler,
            {
                ...redisConnection,
                concurrency: extension.concurrency ?? 1,
            },
        );

        worker.on("completed", async (job) => {
            console.info(
                `[DISTRIBUTION] ${extension.queue}:${job.name} ${job.id} completed`,
            );
        });

        worker.on("failed", (job, err) => {
            console.error(
                `[DISTRIBUTION] ${extension.queue}:${job?.name} ${job?.id} failed`,
                err,
            );
        });

        worker.on("error", (err) => {
            console.error(
                `[DISTRIBUTION] ${extension.queue} worker error: ${err.message}`,
            );
        });

        return worker;
    });

    nitroApp.hooks.hookOnce("close", async () => {
        await Promise.allSettled(
            workers.map((worker) => worker.close()),
        );
    });
});
