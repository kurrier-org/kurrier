"use server";
import { KJUR } from "jsrsasign";

const startOfToday = () => {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const addYears = (d: Date, years: number) =>
	new Date(d.getFullYear() + years, d.getMonth(), d.getDate());

const toEpoch = (d: Date) => Math.floor(d.getTime() / 1000);

const JWS_ALG = "HS256";
const JWT_HEADER_STR = JSON.stringify({ typ: "JWT" });

const makePayload = (role: "anon" | "service_role") => {
	const today = startOfToday();
	const inFiveYears = addYears(today, 5);
	return {
		role,
		iss: "supabase",
		iat: toEpoch(today),
		exp: toEpoch(inFiveYears),
	};
};

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number, alphabet = ALPHABET): string {
	const out: string[] = [];
	const base = alphabet.length;
	const max = Math.floor(0xffffffff / base) * base - 1; // highest unbiased 32-bit value

	const bucket = new Uint32Array(64); // fill in chunks to reduce syscalls
	while (out.length < length) {
		crypto.getRandomValues(bucket);
		for (let i = 0; i < bucket.length && out.length < length; i++) {
			const v = bucket[i];
			if (v <= max) out.push(alphabet[v % base]);
		}
	}
	return out.join("");
}

export async function generateSecrets() {
	// Core JWT secret shared by both tokens
	const JWT_SECRET = randomString(40);

	const anonToken = makePayload("anon");
	const serviceToken = makePayload("service_role");

	const ANON_KEY = KJUR.jws.JWS.sign(
		JWS_ALG,
		JWT_HEADER_STR,
		anonToken,
		JWT_SECRET,
	);
	const SERVICE_ROLE_KEY = KJUR.jws.JWS.sign(
		JWS_ALG,
		JWT_HEADER_STR,
		serviceToken,
		JWT_SECRET,
	);

	// Misc secrets
	const secrets = {
		REDIS_PASSWORD: randomString(24),
		RLS_CLIENT_PASSWORD: randomString(24),
		TYPESENSE_API_KEY: randomString(32),
		POSTGRES_PASSWORD: randomString(24),
		JWT_SECRET,
		ANON_KEY,
		SERVICE_ROLE_KEY,
		DASHBOARD_PASSWORD: randomString(16),
		SECRET_KEY_BASE: randomString(64),
		VAULT_ENC_KEY: randomString(32),
		PG_META_CRYPTO_KEY: randomString(32),
	} as const;

	// Serialize to .env-style text
	return Object.entries(secrets)
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");
}
