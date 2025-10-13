import IORedis from "ioredis";
import { Queue, QueueEvents } from "bullmq";
import { getServerEnv } from "@schema";

const serverConfig = getServerEnv();

const redis = new IORedis({
	maxRetriesPerRequest: null,
	password: serverConfig.REDIS_PASSWORD,
	host: serverConfig.REDIS_HOST || "redis",
	port: Number(serverConfig.REDIS_PORT || 6379),
});

const redisConnection = {
	connection: {
		host: serverConfig.REDIS_HOST || "redis",
		port: Number(serverConfig.REDIS_PORT || 6379),
		password: serverConfig.REDIS_PASSWORD,
	},
};

const smtpQueue = new Queue("smtp-worker", redisConnection);
const smtpEvents = new QueueEvents("smtp-worker", redisConnection);

const sendMailQueue = new Queue("send-mail", redisConnection);
const sendMailEvents = new QueueEvents("send-mail", redisConnection);

const searchIngestQueue = new Queue("search-ingest", redisConnection);
const searchIngestEvents = new QueueEvents("search-ingest", redisConnection);

export async function getRedis() {
	await Promise.all([
		smtpEvents.waitUntilReady(),
		sendMailEvents.waitUntilReady(),
		searchIngestEvents.waitUntilReady(),
	]);
	return {
		connection: redis,
		smtpQueue,
		smtpEvents,
		sendMailQueue,
		sendMailEvents,
		searchIngestQueue,
		searchIngestEvents,
	};
}
