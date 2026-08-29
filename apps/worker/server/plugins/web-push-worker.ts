import { Worker } from "bullmq";
import { defineNitroPlugin } from "nitropack/runtime";
import { getRedis } from "../../lib/get-redis";
import { deliverWebPush } from "../../lib/web-push";

export default defineNitroPlugin(async () => {
	const { connection } = await getRedis();
	new Worker(
		"web-push",
		async (job) => {
			if (job.name !== "web-push:deliver") return;
			await deliverWebPush(job.data.messageId, job.data.subscriptionId);
		},
		{ connection },
	);
});
