import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildThreadingCandidates,
	deduplicateThreadMessages,
	fallbackMessageId,
	normalizeMessageId,
} from "./message-threading";

test("builds ordered unique candidates from reply and references", () => {
	assert.deepEqual(
		buildThreadingCandidates(" <reply@example.test> ", [
			"<root@example.test>",
			"<reply@example.test>",
			"<root@example.test>",
		]),
		["<reply@example.test>", "<root@example.test>"],
	);
});

test("rejects malformed message ids instead of joining unrelated mail", () => {
	assert.equal(normalizeMessageId("not-a-message-id"), null);
	assert.deepEqual(
		buildThreadingCandidates(" <reply@example.test> ", [
			"broken",
			"<root@example.test>",
		]),
		["<reply@example.test>", "<root@example.test>"],
	);
});

test("accepts a folded references header represented as one string", () => {
	assert.deepEqual(
		buildThreadingCandidates(null, [
			"<root@example.test>\n <parent@example.test>",
		]),
		["<root@example.test>", "<parent@example.test>"],
	);
});

test("creates a deterministic fallback id for messages without Message-ID", () => {
	const raw = `From: sender@example.test\n\nhello`;
	assert.equal(fallbackMessageId(raw), fallbackMessageId(raw));
	assert.notEqual(fallbackMessageId(raw), fallbackMessageId(`${raw}!`));
});

test("deduplicates Inbox and Sent copies while preferring the active mailbox", () => {
	const inbox = {
		id: "inbox-copy",
		mailboxId: "inbox",
		messageId: "<same@example.test>",
	};
	const sent = {
		id: "sent-copy",
		mailboxId: "sent",
		messageId: "<same@example.test>",
	};
	assert.deepEqual(deduplicateThreadMessages([inbox, sent], "sent"), [sent]);
});
