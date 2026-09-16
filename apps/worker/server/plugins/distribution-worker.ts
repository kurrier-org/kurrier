import { defineNitroPlugin } from "nitropack/runtime";
import { JobScheduler, Worker } from "bullmq";
import { redisConnection } from "@common";
import { kurrierServer } from "@distribution/kurrier-server";

export default defineNitroPlugin(async (nitroApp) => {
    const extensions = kurrierServer.workers.get();
    const schedulerExtensions = kurrierServer.schedulers.get();

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

    const schedulers = await Promise.all(
        schedulerExtensions.map(async (extension) => {
            const scheduler = new JobScheduler(
                extension.queue,
                redisConnection,
            );

            await scheduler.upsertJobScheduler(
                extension.id,
                {
                    every: extension.every,
                },
                extension.jobName,
                extension.data ?? {},
                {
                    removeOnComplete: true,
                    removeOnFail: false,
                    attempts: 1,
                },
                { override: true },
            );
            console.info(
                `[DISTRIBUTION] scheduler ${extension.id} registered for ${extension.queue}:${extension.jobName}`,
            );
            return scheduler;
        }),
    );

    nitroApp.hooks.hookOnce("close", async () => {
        await Promise.allSettled([
            ...workers.map((worker) => worker.close()),
            ...schedulers.map((scheduler) => scheduler.close()),
        ]);
    });
});
