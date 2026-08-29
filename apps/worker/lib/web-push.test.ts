import assert from "node:assert/strict";
import test from "node:test";
import {
	isStalePushEndpoint,
	makePushPayload,
	nextPushAttempt,
	pushJobId,
} from "./web-push-payload";

test("push payload is generic and contains no mail metadata", () => {
	assert.deepEqual(makePushPayload(), {
		title: "Kurrier",
		body: "New mail in Kurrier",
		url: "/",
	});
	assert.equal(JSON.stringify(makePushPayload()).includes("subject"), false);
});
test("push jobs have a stable idempotency key", () => {
	assert.equal(pushJobId("message-1"), "web-push:message-1");
});
test("only gone and not-found endpoints are stale", () => {
	assert.equal(isStalePushEndpoint(404), true);
	assert.equal(isStalePushEndpoint(410), true);
	assert.equal(isStalePushEndpoint(401), false);
});

test("delivery attempt accounting increments and bounds retries", () => {
	assert.deepEqual(nextPushAttempt(0), { attempts: 1, retryable: true });
	assert.deepEqual(nextPushAttempt(4), { attempts: 5, retryable: false });
	assert.deepEqual(nextPushAttempt(5), { attempts: 6, retryable: false });
});

import { MAX_PUSH_ATTEMPTS } from "./web-push-payload";
import { reconcileWebPushDeliveryJob } from "./web-push-reconcile";

const delivery = { messageId: "message-1", subscriptionId: "subscription-1" };

test("reconciliation retries a retained failed BullMQ job instead of adding a duplicate", async () => {
	const calls: string[] = [];
	const queue = {
		getJob: async (jobId: string) => {
			assert.equal(
				jobId,
				pushJobId(delivery.messageId, delivery.subscriptionId),
			);
			return {
				getState: async () => "failed" as const,
				retry: async (_state: "wait") => calls.push("retry:wait"),
			};
		},
		add: async () => calls.push("add"),
	};

	await reconcileWebPushDeliveryJob(queue, delivery);

	assert.deepEqual(calls, ["retry:wait"]);
});

test("reconciliation adds a missing job with the stable delivery id", async () => {
	let options: Record<string, unknown> | undefined;
	const queue = {
		getJob: async () => undefined,
		add: async (
			_name: string,
			_data: typeof delivery,
			nextOptions: Record<string, unknown>,
		) => {
			options = nextOptions;
		},
	};

	await reconcileWebPushDeliveryJob(queue, delivery);

	assert.equal(
		options?.jobId,
		pushJobId(delivery.messageId, delivery.subscriptionId),
	);
	assert.equal(options?.attempts, MAX_PUSH_ATTEMPTS);
});
