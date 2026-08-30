import assert from "node:assert/strict";
import test from "node:test";
import { shouldEnqueueNewMailPush } from "./message-payload-parser-push";

test("only newly inserted messages enqueue web push delivery", () => {
	assert.equal(shouldEnqueueNewMailPush(false), true);
	assert.equal(shouldEnqueueNewMailPush(true), false);
});
