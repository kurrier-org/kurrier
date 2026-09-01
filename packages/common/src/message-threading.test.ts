import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildThreadingCandidates,
	deduplicateThreadMessages,
	extractThreadingHeader,
	fallbackMessageId,
	normalizeMessageId,
	parseThreadingReferences,
	resolveMessageId,
	selectThreadParent,
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
	assert.equal(normalizeMessageId("junk <victim@example.com> trailing"), null);
	assert.deepEqual(
		buildThreadingCandidates(" <reply@example.test> ", [
			"broken",
			"<root@example.test>",
			"junk <victim@example.com> trailing",
		]),
		["<reply@example.test>", "<root@example.test>"],
	);
});

test("rejects malformed References values containing embedded message ids", () => {
	assert.deepEqual(
		buildThreadingCandidates(null, ["prefix <victim@example.com> suffix"]),
		[],
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

test("normalizes a raw References header into stored message IDs", () => {
	const raw = [
		"References: <root@example.test>",
		"	<parent@example.test>",
		"",
	].join("\r\n");

	assert.deepEqual(
		parseThreadingReferences([extractThreadingHeader(raw, "references")]),
		["<root@example.test>", "<parent@example.test>"],
	);
});

test("normalizes legacy stored References values before reply composition", () => {
	assert.deepEqual(
		parseThreadingReferences(["<root@example.test> <parent@example.test>"]),
		["<root@example.test>", "<parent@example.test>"],
	);
});

test("creates a deterministic fallback id for messages without Message-ID", () => {
	const raw = `From: sender@example.test\n\nhello`;
	assert.equal(fallbackMessageId(raw), fallbackMessageId(raw));
	assert.notEqual(fallbackMessageId(raw), fallbackMessageId(`${raw}!`));
});

test("extracts the complete References header before mailparser splits it", () => {
	const raw = [
		"From: sender@example.test",
		"References: <good@example.test> junk <victim@example.test>",
		"\t<folded@example.test>",
		"Subject: test",
		"",
		"body",
	].join("\r\n");

	assert.equal(
		extractThreadingHeader(raw, "references"),
		"<good@example.test> junk <victim@example.test> <folded@example.test>",
	);
});

test("does not consume a new header as part of a malformed folded header", () => {
	const raw = [
		"References: junk <victim@example.test>",
		"X-Injected: <attacker@example.test>",
		"\t<continued@example.test>",
		"",
	].join("\r\n");

	assert.equal(
		extractThreadingHeader(raw, "references"),
		"junk <victim@example.test>",
	);
	assert.deepEqual(
		buildThreadingCandidates(extractThreadingHeader(raw, "in-reply-to"), [
			extractThreadingHeader(raw, "references"),
		]),
		[],
	);
});

test("does not parse body text as a threading header", () => {
	const raw = ["Subject: test", "", "References: <body@example.test>"].join(
		"\r\n",
	);

	assert.equal(extractThreadingHeader(raw, "references"), null);
});

test("accepts legitimate folded threading headers through the raw header seam", () => {
	const raw = [
		"In-Reply-To: <reply@example.test>",
		"References: <root@example.test>",
		"\t<parent@example.test>",
		"",
	].join("\r\n");

	assert.deepEqual(
		buildThreadingCandidates(extractThreadingHeader(raw, "in-reply-to"), [
			extractThreadingHeader(raw, "references"),
		]),
		["<reply@example.test>", "<root@example.test>", "<parent@example.test>"],
	);
});

test("uses the fallback at storage when parsed Message-ID values are invalid", () => {
	const raw = "Message-ID: <bad\\@example.com>\r\n\r\nbody";
	const fallback = fallbackMessageId(raw);

	assert.equal(
		resolveMessageId(raw, "<bad\\@example.com>", "<also(comment)@example.com>"),
		fallback,
	);
	assert.equal(
		resolveMessageId(raw, "<valid@example.com>", "<bad\\@example.com>"),
		"<valid@example.com>",
	);
});

test("rejects message ids with invalid dot-atom punctuation", () => {
	for (const value of [
		"<.leading@example.com>",
		"<trailing.@example.com>",
		"<double..dot@example.com>",
		"<user@.example.com>",
		"<user@example..com>",
		"<user@example.com.>",
		"<user@example.com:25>",
		"<user\\@example.com>",
		"<user(comment)@example.com>",
		"<user@example.com(comment)>",
	]) {
		assert.equal(normalizeMessageId(value), null, value);
	}
});

test("selects the final References candidate when In-Reply-To is absent", () => {
	assert.equal(
		selectThreadParent(
			null,
			["<root@example.test>", "<parent@example.test>"],
			["<parent@example.test>", "<root@example.test>"],
		),
		"<parent@example.test>",
	);
});

test("uses valid message IDs from a multi-value In-Reply-To header", () => {
	assert.equal(
		selectThreadParent(
			"<first@example.test> <reply@example.test>",
			["<root@example.test>"],
			["<reply@example.test>", "<root@example.test>"],
		),
		"<reply@example.test>",
	);
});

test("prioritizes In-Reply-To and then scans References from final to earliest", () => {
	assert.equal(
		selectThreadParent(
			"<reply@example.test>",
			["<root@example.test>", "<parent@example.test>"],
			["<root@example.test>", "<reply@example.test>", "<parent@example.test>"],
		),
		"<reply@example.test>",
	);
	assert.equal(
		selectThreadParent(
			null,
			["<root@example.test>", "<parent@example.test>", "<latest@example.test>"],
			["<root@example.test>", "<parent@example.test>", "<latest@example.test>"],
		),
		"<latest@example.test>",
	);
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
