import { defineNitroPlugin } from "nitropack/runtime";
import { JobScheduler, Worker } from "bullmq";
import { redisConnection } from "@common";
import { kurrierServer } from "@distribution/kurrier-server";

export default defineNitroPlugin(async (nitroApp) => {
    const extensions = kurrierServer.workers.get();
    const schedulerExtensions = kurrierServer.schedulers.get();
    const serviceExtensions = kurrierServer.services.get();

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

    const services = await Promise.all(
        serviceExtensions.map(async (extension) => {
            const cleanup = await extension.start();
            console.info(`[DISTRIBUTION] service ${extension.id} started`,);
            return cleanup;
        }),
    );

    nitroApp.hooks.hookOnce("close", async () => {
        await Promise.allSettled([
            ...services
                .filter((cleanup) => typeof cleanup === "function")
                .map((cleanup) => cleanup()),
            ...workers.map((worker) => worker.close()),
            ...schedulers.map((scheduler) => scheduler.close()),
        ]);
    });
});
