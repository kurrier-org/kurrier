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
