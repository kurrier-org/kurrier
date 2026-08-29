import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_SUBSCRIPTIONS_PER_USER = 20;
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_USER_AGENT_LENGTH = 512;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

type Address = { address: string; family: number };
type Resolver = (hostname: string) => Promise<Address[]>;

export function isUnsafeWebPushAddress(address: string) {
	const normalized = address.toLowerCase();
	if (normalized === "localhost" || normalized.endsWith(".localhost"))
		return true;
	if (isIP(normalized) === 4) {
		const [a, b] = normalized.split(".").map(Number);
		return (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 0) ||
			(a === 192 && b === 168) ||
			(a === 192 && b === 2) ||
			(a === 198 && b === 51) ||
			(a === 203 && b === 0) ||
			(a === 198 && (b === 18 || b === 19)) ||
			(a === 100 && b >= 64 && b <= 127) ||
			a >= 224
		);
	}
	if (isIP(normalized) === 6) {
		if (normalized.startsWith("::ffff:")) {
			return isPrivateOrReserved(normalized.slice("::ffff:".length));
		}
		return (
			normalized === "::" ||
			normalized === "::1" ||
			normalized.startsWith("fc") ||
			normalized.startsWith("fd") ||
			normalized.startsWith("fe8") ||
			normalized.startsWith("fe9") ||
			normalized.startsWith("fea") ||
			normalized.startsWith("feb")
		);
	}
	return false;
}

export async function validateWebPushSubscription<
	T extends {
		endpoint: string;
		keys: { p256dh: string; auth: string };
		userAgent?: string;
	},
>(
	input: T,
	resolve: Resolver = async (hostname) => lookup(hostname, { all: true }),
) {
	if (
		!input ||
		typeof input.endpoint !== "string" ||
		input.endpoint.length > MAX_ENDPOINT_LENGTH
	)
		throw new Error("Invalid Web Push subscription endpoint");
	let endpoint: URL;
	try {
		endpoint = new URL(input.endpoint);
	} catch {
		throw new Error("Invalid Web Push subscription endpoint");
	}
	if (
		endpoint.protocol !== "https:" ||
		endpoint.username ||
		endpoint.password ||
		endpoint.hostname.length > 253
	)
		throw new Error("Web Push endpoint must use HTTPS");
	if (
		!input.keys ||
		typeof input.keys.p256dh !== "string" ||
		typeof input.keys.auth !== "string" ||
		input.keys.p256dh.length !== 87 ||
		input.keys.auth.length !== 22 ||
		!BASE64URL.test(input.keys.p256dh) ||
		!BASE64URL.test(input.keys.auth)
	)
		throw new Error("Invalid Web Push subscription keys");
	if (
		input.userAgent !== undefined &&
		(typeof input.userAgent !== "string" ||
			input.userAgent.length > MAX_USER_AGENT_LENGTH)
	)
		throw new Error("Invalid Web Push user agent");
	const addresses = isIP(endpoint.hostname)
		? [{ address: endpoint.hostname, family: isIP(endpoint.hostname) }]
		: await resolve(endpoint.hostname);
	if (
		!addresses.length ||
		addresses.some(({ address }) => isUnsafeWebPushAddress(address))
	)
		throw new Error(
			"Web Push endpoint resolves to a private or reserved address",
		);
	return { ...input, endpoint: endpoint.toString() };
}
