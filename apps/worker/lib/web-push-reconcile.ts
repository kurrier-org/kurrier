import type { Queue } from "bullmq";
import { MAX_PUSH_ATTEMPTS, pushJobId } from "./web-push-payload";

export type PushQueue = Pick<Queue, "add" | "getJob">;

const pushJobOptions = {
	attempts: MAX_PUSH_ATTEMPTS,
	backoff: { type: "exponential" as const, delay: 5000 },
	removeOnComplete: true,
	removeOnFail: false,
};

export async function reconcileWebPushDeliveryJob(
	queue: PushQueue,
	delivery: { messageId: string; subscriptionId: string },
) {
	const jobId = pushJobId(delivery.messageId, delivery.subscriptionId);
	const existing = await queue.getJob(jobId);
	if (existing) {
		if ((await existing.getState()) === "failed") await existing.retry("wait");
		return;
	}
	await queue.add("web-push:deliver", delivery, { jobId, ...pushJobOptions });
}
