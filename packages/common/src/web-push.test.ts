import assert from "node:assert/strict";
import test from "node:test";
import {
	isUnsafeWebPushAddress,
	MAX_SUBSCRIPTIONS_PER_USER,
	validateWebPushSubscription,
} from "./web-push";

test("classifies IPv4, IPv6, mapped, and reserved addresses as unsafe", () => {
	const unsafe = [
		"0.0.0.0",
		"10.1.2.3",
		"100.64.0.1",
		"127.0.0.1",
		"169.254.1.1",
		"172.16.0.1",
		"192.0.0.1",
		"192.0.2.1",
		"198.18.0.1",
		"198.51.100.1",
		"203.0.113.1",
		"224.0.0.1",
		"240.0.0.1",
		"::",
		"::1",
		"::ffff:192.0.2.1",
		"fc00::1",
		"fe80::1",
		"2001:db8::1",
		"2001:10::1",
		"100::1",
		"ff02::1",
	];
	for (const address of unsafe)
		assert.equal(isUnsafeWebPushAddress(address), true, address);
	for (const address of ["8.8.8.8", "2001:4860:4860::8888"])
		assert.equal(isUnsafeWebPushAddress(address), false, address);
});

test("classifies hexadecimal and expanded IPv4-mapped loopback addresses as unsafe", () => {
	for (const address of ["::ffff:7f00:1", "0:0:0:0:0:ffff:7f00:1"])
		assert.equal(isUnsafeWebPushAddress(address), true, address);
});

test("classifies IPv4 translation and compatible IPv6 addresses by embedded IPv4", () => {
	for (const address of [
		"64:ff9b::127.0.0.1",
		"64:ff9b::10.0.0.1",
		"64:ff9b:1::192.0.2.1",
		"::127.0.0.1",
		"0:0:0:0:0:0:192.0.2.1",
	])
		assert.equal(isUnsafeWebPushAddress(address), true, address);
	assert.equal(isUnsafeWebPushAddress("64:ff9b::8.8.8.8"), false);
});

test("classifies IPv6 addresses when Array.prototype.at is unavailable", () => {
	const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, "at");
	Object.defineProperty(Array.prototype, "at", {
		configurable: true,
		value: undefined,
	});
	try {
		assert.equal(isUnsafeWebPushAddress("::ffff:127.0.0.1"), true);
		assert.equal(isUnsafeWebPushAddress("2001:4860:4860::8888"), false);
	} finally {
		if (descriptor) Object.defineProperty(Array.prototype, "at", descriptor);
		else delete Array.prototype.at;
	}
});

test("rejects non-HTTPS and private Web Push endpoints", async () => {
	await assert.rejects(
		validateWebPushSubscription(
			{
				endpoint: "http://127.0.0.1/push",
				keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
			},
			async () => [{ address: "127.0.0.1", family: 4 }],
		),
		/HTTPS/,
	);
	await assert.rejects(
		validateWebPushSubscription(
			{
				endpoint: "https://push.example.test/push",
				keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
			},
			async () => [{ address: "10.0.0.1", family: 4 }],
		),
		/private|reserved/i,
	);
});

test("accepts only strict subscription key lengths and bounded fields", async () => {
	await assert.rejects(
		validateWebPushSubscription({
			endpoint: "https://push.example.test/push",
			keys: { p256dh: "A", auth: "A" },
		}),
		/subscription/i,
	);
	const valid = await validateWebPushSubscription(
		{
			endpoint: "https://push.example.test/push",
			keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
		},
		async () => [{ address: "8.8.8.8", family: 4 }],
	);
	assert.equal(valid.endpoint, "https://push.example.test/push");
});

test("defines a finite per-user subscription limit", () => {
	assert.equal(MAX_SUBSCRIPTIONS_PER_USER, 20);
});

test("rejects a hostname when any DNS answer is unsafe", async () => {
	await assert.rejects(
		validateWebPushSubscription(
			{
				endpoint: "https://push.example.test/push",
				keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
			},
			async () => [
				{ address: "8.8.8.8", family: 4 },
				{ address: "::ffff:127.0.0.1", family: 6 },
			],
		),
		/private|reserved/i,
	);
});

test("classifies URL IPv6 literals without DNS lookup", async () => {
	const resolve = async () => {
		throw new Error("DNS lookup should not run for an IPv6 literal");
	};
	const valid = await validateWebPushSubscription(
		{
			endpoint: "https://[2001:4860:4860::8888]/push",
			keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
		},
		resolve,
	);
	assert.equal(valid.endpoint, "https://[2001:4860:4860::8888]/push");
	await assert.rejects(
		validateWebPushSubscription(
			{
				endpoint: "https://[::ffff:127.0.0.1]/push",
				keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
			},
			resolve,
		),
		/private|reserved/i,
	);
});
