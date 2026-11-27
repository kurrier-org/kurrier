import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { replyRecipient } from "./eligibility";
import { validMailgunSignature } from "./mailgun-signature";

test("personal mail uses the return path, preserving plus tags", () => {
	assert.equal(
		replyRecipient(
			{ "Return-Path": "<Person+tag@example.com>" },
			"support@example.com",
		),
		"person+tag@example.com",
	);
	assert.equal(
		replyRecipient(
			{ "Auto-Submitted": "no", "return-path": "<person@example.com>" },
			"support@example.com",
		),
		"person@example.com",
	);
});
for (const headers of [
	{ "List-Id": "news" },
	{ list: { unsubscribe: "https://example.com" } },
	{ "List-Unsubscribe": ["mailto:list@example.com"] },
	{ "Auto-Submitted": "auto-generated" },
	{ "Auto-Submitted": "auto-replied; owner-email=x@example.com" },
	{ Precedence: "bulk" },
	{
		"Content-Type": {
			value: "multipart/report",
			params: { "report-type": "delivery-status" },
		},
	},
	{ "Return-Path": "<>" },
	{ "X-Auto-Response-Suppress": "DR, OOF" },
	{ "X-Autoreply": "yes" },
])
	test(`excluded header ${JSON.stringify(headers)}`, () => {
		assert.equal(
			replyRecipient(
				{ "return-path": "<sender@example.com>", ...headers },
				"support@example.com",
			),
			null,
		);
	});
test("empty envelope, self mail and missing return path are excluded", () => {
	assert.equal(replyRecipient({}, "support@example.com"), null);
	assert.equal(
		replyRecipient(
			{ "return-path": "<sender@example.com>" },
			"support@example.com",
			"",
		),
		null,
	);
	assert.equal(
		replyRecipient({}, "support@example.com", "support@example.com"),
		null,
	);
});
test("Mailgun authentication rejects altered and stale signatures", () => {
	const timestamp = "1700000000",
		token = "random";
	const signature = createHmac("sha256", "key")
		.update(timestamp + token)
		.digest("hex");
	assert.ok(
		validMailgunSignature(
			{ timestamp, token, signature },
			"key",
			1700000000000,
		),
	);
	assert.equal(
		validMailgunSignature(
			{ timestamp, token: "changed", signature },
			"key",
			1700000000000,
		),
		false,
	);
	assert.equal(
		validMailgunSignature(
			{ timestamp, token, signature },
			"key",
			1700000500000,
		),
		false,
	);
});
