import { getRedis } from "../get-redis";

// const DAILY_CAP_BYTES = 1_000_000_000;   // 1 GB
// const INTERACTIVE_RESERVE = 200_000_000; // reserve 200MB
// export const DEFAULT_BACKFILL_BUDGET = Math.max(0, DAILY_CAP_BYTES - INTERACTIVE_RESERVE);
// export const BACKFILL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

const DAILY_CAP_BYTES = 5 * 1024 * 1024; // 5 MB per day (easy to hit quickly)
const INTERACTIVE_RESERVE = 1 * 1024 * 1024; // reserve 1 MB
export const DEFAULT_BACKFILL_BUDGET = Math.max(
	0,
	DAILY_CAP_BYTES - INTERACTIVE_RESERVE,
);
export const BACKFILL_WINDOW_MS = 60 * 1000; // 1 minute window for testing (instead of 24h)

export interface BudgetState {
	bytesUsed: number;
	windowStart: number;
}

async function getRedisClient() {
	const { connection } = await getRedis();
	return connection;
}

export async function loadBudget(identityId: string): Promise<BudgetState> {
	const redis = await getRedisClient();
	const key = `imap:budget:${identityId}`;
	const raw = await redis.get(key);
	if (!raw) return { bytesUsed: 0, windowStart: Date.now() };
	try {
		return JSON.parse(raw);
	} catch (e) {
		console.warn(`[imap:budget] Invalid JSON for ${key}`, e);
		return { bytesUsed: 0, windowStart: Date.now() };
	}
}

export async function saveBudget(identityId: string, s: BudgetState) {
	const redis = await getRedisClient();
	const key = `imap:budget:${identityId}`;
	await redis.set(key, JSON.stringify(s), "PX", BACKFILL_WINDOW_MS + 60_000);
}

export function maybeResetWindow(state: BudgetState): BudgetState {
	if (Date.now() - state.windowStart >= BACKFILL_WINDOW_MS) {
		return { bytesUsed: 0, windowStart: Date.now() };
	}
	return state;
}

export async function consumeBudget(identityId: string, bytes: number) {
	// const redis = await getRedisClient();
	const state = maybeResetWindow(await loadBudget(identityId));
	const newUsed = Math.min(DEFAULT_BACKFILL_BUDGET, state.bytesUsed + bytes);
	const updated: BudgetState = {
		bytesUsed: newUsed,
		windowStart: state.windowStart,
	};
	await saveBudget(identityId, updated);
	return updated;
}
