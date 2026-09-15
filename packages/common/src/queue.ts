import { Queue } from "bullmq";

import { redisConnection } from "./redis-ops";

const queues = new Map<string, Queue>();

export function getQueue(name: string) {
    const existing = queues.get(name);

    if (existing) {
        return existing;
    }

    const queue = new Queue(name, redisConnection);

    queues.set(name, queue);

    return queue;
}

export async function enqueueJob<T>(
    queueName: string,
    jobName: string,
    data: T,
) {
    const queue = getQueue(queueName);

    await queue.waitUntilReady();

    return queue.add(jobName, data);
}
