import { getServerEnv } from "@schema";
import { Queue, QueueEvents } from "bullmq";

export const getRedis = async () => {
	const { REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = getServerEnv();

	const redisConnection = {
		connection: {
			host: REDIS_HOST || "redis",
			port: Number(REDIS_PORT || 6379),
			password: REDIS_PASSWORD,
		},
	};
	const smtpQueue = new Queue("smtp-worker", redisConnection);
	const smtpEvents = new QueueEvents("smtp-worker", redisConnection);

	const sendMailQueue = new Queue("send-mail", redisConnection);
	const sendMailEvents = new QueueEvents("send-mail", redisConnection);

	const searchIngestQueue = new Queue("search-ingest", redisConnection);
	const searchIngestEvents = new QueueEvents("search-ingest", redisConnection);

	const davQueue = new Queue("dav-worker", redisConnection);
	const davEvents = new QueueEvents("dav-worker", redisConnection);

	await smtpEvents.waitUntilReady();
	await sendMailEvents.waitUntilReady();
	await searchIngestEvents.waitUntilReady();
	await davEvents.waitUntilReady();

	return {
		smtpQueue,
		smtpEvents,
		sendMailQueue,
		sendMailEvents,
		searchIngestQueue,
		searchIngestEvents,
		davQueue,
		davEvents,
	};
};
