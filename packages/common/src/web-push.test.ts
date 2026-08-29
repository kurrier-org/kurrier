import assert from "node:assert/strict";
import test from "node:test";
import {
	MAX_SUBSCRIPTIONS_PER_USER,
	validateWebPushSubscription,
} from "./web-push";

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
