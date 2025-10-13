import { defineNitroPlugin } from "nitropack/runtime";
import { Worker } from "bullmq";

import { getRedis } from "../../lib/get-redis";
import { rebuild } from "../../lib/search/search-rebuild";
import {
	indexMessage,
	deleteMessage,
	refreshThread,
} from "../../lib/search/search-operations";

import { getServerEnv } from "@schema";
const { SEARCH_REBUILD_ON_BOOT } = getServerEnv();

export default defineNitroPlugin(async () => {
	console.log("[typesense] boot");

	const connection = (await getRedis()).connection;

	const worker = new Worker(
		"search-ingest",
		async (job) => {
			switch (job.name) {
				case "add": {
					const { messageId } = job.data as { messageId: string };
					await indexMessage(messageId);
					return { success: true };
				}
				case "remove": {
					const { messageId } = job.data as { messageId: string };
					await deleteMessage(messageId);
					return { success: true };
				}
				case "refresh-thread": {
					const { threadId } = job.data as { threadId: string };
					await refreshThread(threadId);
					return { success: true };
				}
				case "rebuild": {
					await rebuild();
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

	if (SEARCH_REBUILD_ON_BOOT === "true") await rebuild();
});
