import IORedis from "ioredis";
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

const PREFIX = "kurrier:";

export async function kvSet(key: string, value: unknown, ttlSec?: number) {
	const v = typeof value === "string" ? value : JSON.stringify(value);
	return ttlSec
		? redis.set(PREFIX + key, v, "EX", ttlSec)
		: redis.set(PREFIX + key, v);
}

export async function kvGet<T = unknown>(
	key: string,
): Promise<T | string | null> {
	const raw = await redis.get(PREFIX + key);
	if (raw == null) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return raw;
	}
}

export async function kvDel(key: string) {
	return redis.del(PREFIX + key);
}

export async function kvIncrBy(key: string, amount: number) {
	const fullKey = PREFIX + key;
	return redis.incrby(fullKey, amount);
}

export async function kvIncrByTTL(
	key: string,
	amount: number,
	ttlSec: number,
): Promise<number> {
	const fullKey = PREFIX + key;

	const tx = redis.multi();
	tx.incrby(fullKey, amount);
	tx.expire(fullKey, ttlSec);

	const res = await tx.exec();
	if (!res) {
		throw new Error("Redis transaction aborted");
	}
	const [incrResult] = res;
	const [err, val] = incrResult;

	if (err) {
		throw err;
	}

	return Number(val);
}

export async function initRedis() {
	return {
		connection: redisConnection,
		redis,
	};
}
