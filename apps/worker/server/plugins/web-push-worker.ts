import { Worker } from "bullmq";
import { defineNitroPlugin } from "nitropack/runtime";
import { z } from "zod";
import { getRedis } from "../../lib/get-redis";
import {
	deliverWebPush,
	reconcileQueuedWebPushDeliveries,
} from "../../lib/web-push";

export default defineNitroPlugin(async () => {
	const { connection } = await getRedis();
	new Worker(
		"web-push",
		async (job) => {
			if (job.name !== "web-push:deliver") return;
			const payload = z
				.object({
					messageId: z.string().uuid(),
					subscriptionId: z.string().uuid(),
				})
				.parse(job.data);
			await deliverWebPush(payload.messageId, payload.subscriptionId);
		},
		{ connection },
	);
	await reconcileQueuedWebPushDeliveries((await getRedis()).webPushQueue);
});
