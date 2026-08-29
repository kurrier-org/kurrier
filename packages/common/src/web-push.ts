import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_SUBSCRIPTIONS_PER_USER = 20;
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_USER_AGENT_LENGTH = 512;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

type Address = { address: string; family: number };
type Resolver = (hostname: string) => Promise<Address[]>;

function isUnsafeIPv4(n: number) {
	return [
		[n, 0, 0xff000000],
		[n, 0x0a000000, 0xff000000],
		[n, 0x64400000, 0xffc00000],
		[n, 0x7f000000, 0xff000000],
		[n, 0xa9fe0000, 0xffff0000],
		[n, 0xac100000, 0xfff00000],
		[n, 0xc0000000, 0xffffff00],
		[n, 0xc0000200, 0xffffff00],
		[n, 0xc0586300, 0xffffff00],
		[n, 0xc6120000, 0xffff0000],
		[n, 0xc6336400, 0xffffff00],
		[n, 0xcb007100, 0xffffff00],
		[n, 0xe0000000, 0xe0000000],
		[n, 0xf0000000, 0xf0000000],
	].some(([value, base, mask]) => (value & mask) >>> 0 === base >>> 0);
}

export function isUnsafeWebPushAddress(address: string) {
	const normalized = address.toLowerCase().replace(/\.+$/, "");
	if (normalized === "localhost" || normalized.endsWith(".localhost"))
		return true;
	if (isIP(normalized) === 4) {
		const n = normalized
			.split(".")
			.reduce((value, part) => value * 256 + Number(part), 0);
		return isUnsafeIPv4(n);
	}
	if (isIP(normalized) !== 6) return false;
	const groups = normalized.split("::");
	const expandIPv4 = (parts: string[]) => {
		const last = parts.at(-1);
		if (!last?.includes(".")) return parts;
		const octets = last.split(".").map(Number);
		return [
			...parts.slice(0, -1),
			((octets[0] << 8) | octets[1]).toString(16),
			((octets[2] << 8) | octets[3]).toString(16),
		];
	};
	const left = expandIPv4(groups[0] ? groups[0].split(":") : []);
	const right = expandIPv4(groups[1] ? groups[1].split(":") : []);
	const words = left
		.concat(Array(8 - left.length - right.length).fill("0"), right)
		.map((x) => parseInt(x, 16));
	const value = words.reduce((n, word) => (n << 16n) | BigInt(word), 0n);
	const mappedIPv4 = value >> 32n === 0xffffn;
	if (mappedIPv4) {
		const ipv4 = Number(value & 0xffffffffn);
		return isUnsafeIPv4(ipv4);
	}
	const prefix = (bits: number) => value >> BigInt(128 - bits);
	return (
		prefix(128) === 0n ||
		prefix(128) === 1n ||
		prefix(8) === 0xffn ||
		prefix(7) === 0x7en ||
		prefix(10) === 0x3fan ||
		prefix(32) === 0x20010db8n ||
		prefix(28) === 0x2001001n ||
		prefix(64) === 0x100000000000000n ||
		prefix(32) === 0x20010000n ||
		prefix(16) === 0x2002n
	);
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
