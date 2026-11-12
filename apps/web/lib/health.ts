import { db } from "@db";
import { getServerEnv } from "@schema";
import { sql } from "drizzle-orm";
import IORedis from "ioredis";

export type HealthCheckStatus = "ok" | "error";

export type HealthReport = {
	status: HealthCheckStatus;
	database: HealthCheckStatus;
	redis: HealthCheckStatus;
};

const CHECK_TIMEOUT_MS = 3000;

async function withTimeout<T>(task: Promise<T>, label: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error(`${label} check timed out`)),
			CHECK_TIMEOUT_MS,
		);
	});

	try {
		return await Promise.race([task, timeout]);
	} finally {
		clearTimeout(timer);
	}
}

async function pingDatabase() {
	await db.execute(sql`select 1`);
}

async function pingRedis() {
	const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = getServerEnv();

	// A short-lived connection that never retries or queues commands, so an
	// unreachable Redis fails fast instead of hanging the health probe.
	const client = new IORedis({
		host: REDIS_HOST || "redis",
		port: Number(REDIS_PORT || 6379),
		password: REDIS_PASSWORD,
		lazyConnect: true,
		connectTimeout: CHECK_TIMEOUT_MS,
		maxRetriesPerRequest: 0,
		enableOfflineQueue: false,
		retryStrategy: () => null,
	});
	client.on("error", () => {});

	try {
		await client.connect();
		await client.ping();
	} finally {
		client.disconnect();
	}
}

async function runCheck(
	label: string,
	check: () => Promise<void>,
): Promise<HealthCheckStatus> {
	try {
		await withTimeout(check(), label);
		return "ok";
	} catch (error) {
		// Log server-side only; the response never carries error details.
		console.error(`[health] ${label} check failed:`, error);
		return "error";
	}
}

export async function getHealthReport(): Promise<HealthReport> {
	const [database, redis] = await Promise.all([
		runCheck("database", pingDatabase),
		runCheck("redis", pingRedis),
	]);

	return {
		status: database === "ok" && redis === "ok" ? "ok" : "error",
		database,
		redis,
	};
}
