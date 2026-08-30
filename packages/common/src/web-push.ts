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
	const hasPrefix = (bits: number, expected: number[]) => {
		const wholeWords = Math.floor(bits / 16);
		if (
			words.some(
				(word, index) => index < wholeWords && word !== expected[index],
			)
		)
			return false;
		const remainingBits = bits % 16;
		if (!remainingBits) return true;
		const mask = (0xffff << (16 - remainingBits)) & 0xffff;
		return (words[wholeWords] & mask) === (expected[wholeWords] & mask);
	};
	const embeddedIPv4 = words[6] * 0x10000 + words[7];
	// IPv4-mapped addresses have six zero words followed by ffff.
	const mapped =
		words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
	const translatedIPv4 =
		hasPrefix(96, [0x64, 0xff9b, 0, 0, 0, 0]) ||
		hasPrefix(48, [0x64, 0xff9b, 1]) ||
		hasPrefix(96, [0, 0, 0, 0, 0, 0]);
	if (mapped || translatedIPv4) return isUnsafeIPv4(embeddedIPv4);
	return (
		hasPrefix(128, [0, 0, 0, 0, 0, 0, 0, 0]) ||
		hasPrefix(128, [0, 0, 0, 0, 0, 0, 0, 1]) ||
		hasPrefix(8, [0xff00]) ||
		hasPrefix(7, [0xfc00]) ||
		hasPrefix(10, [0xfe80]) ||
		hasPrefix(32, [0x2001, 0xdb8]) ||
		hasPrefix(28, [0x2001, 0x0010]) ||
		hasPrefix(64, [0x0100, 0, 0, 0]) ||
		hasPrefix(32, [0x2001, 0]) ||
		hasPrefix(16, [0x2002])
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
	const hostname = endpoint.hostname.replace(/^\[|\]$/g, "");
	const hostnameFamily = isIP(hostname);
	const addresses = hostnameFamily
		? [{ address: hostname, family: hostnameFamily }]
		: await resolve(hostname);
	if (
		!addresses.length ||
		addresses.some(({ address }) => isUnsafeWebPushAddress(address))
	)
		throw new Error(
			"Web Push endpoint resolves to a private or reserved address",
		);
	return { ...input, endpoint: endpoint.toString() };
}
