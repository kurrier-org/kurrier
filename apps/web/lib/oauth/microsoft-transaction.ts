import crypto from "node:crypto";
import { getServerEnv } from "@schema";
import Redis from "ioredis";

export type MicrosoftOAuthTransaction = {
	userId: string;
	workspaceId: string;
	publicId: string;
	state: string;
	codeVerifier: string;
	nonce: string;
};

let redis: Redis | undefined;
function getClient() {
	if (!redis) {
		const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = getServerEnv();
		redis = new Redis({
			host: REDIS_HOST || "redis",
			port: Number(REDIS_PORT || 6379),
			password: REDIS_PASSWORD,
		});
	}
	return redis;
}
export function createMicrosoftOAuthTransactionRecord(
	input: MicrosoftOAuthTransaction,
) {
	return input;
}

export async function createMicrosoftOAuthTransaction(
	input: MicrosoftOAuthTransaction,
) {
	const id = crypto.randomBytes(32).toString("base64url");
	await getClient().set(
		`oauth:microsoft:${id}`,
		JSON.stringify(createMicrosoftOAuthTransactionRecord(input)),
		"EX",
		600,
	);
	return { id, state: input.state };
}
export async function consumeMicrosoftOAuthTransaction(id: string) {
	const raw = await getClient().getdel(`oauth:microsoft:${id}`);
	return raw ? (JSON.parse(raw) as MicrosoftOAuthTransaction) : null;
}
