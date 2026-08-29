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
