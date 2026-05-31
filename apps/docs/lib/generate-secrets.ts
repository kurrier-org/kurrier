"use server";

function randomBase64Url(bytes: number) {
	const array = new Uint8Array(bytes);
	crypto.getRandomValues(array);

	return Buffer.from(array)
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function randomBase64(bytes: number) {
	const array = new Uint8Array(bytes);
	crypto.getRandomValues(array);
	return Buffer.from(array).toString("base64");
}

function randomHex(bytes: number) {
	const array = new Uint8Array(bytes);
	crypto.getRandomValues(array);
	return Buffer.from(array).toString("hex");
}

export async function generateSecrets() {
	const POSTGRES_PASSWORD = randomBase64Url(24);
	const REDIS_PASSWORD = randomBase64Url(24);
	const TYPESENSE_API_KEY = randomBase64Url(32);
	const JWT_SECRET = randomBase64Url(48);
	const APP_SECRET_ENCRYPTION_KEY = randomBase64(32);
	const GARAGE_SECRET_KEY = randomBase64Url(32);
	const GARAGE_RPC_SECRET = randomHex(32);

	const secrets = {
		REDIS_PASSWORD,
		TYPESENSE_API_KEY,
		POSTGRES_PASSWORD,
		JWT_SECRET,
		APP_SECRET_ENCRYPTION_KEY,
		GARAGE_SECRET_KEY,
		GARAGE_RPC_SECRET,
	};

	return Object.entries(secrets)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
}
