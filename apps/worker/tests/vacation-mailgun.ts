import assert from "node:assert/strict";
import { MailgunMailer } from "../../../packages/providers/src/mail/mailgun";
import { vacationHeaders } from "../lib/vacation/delivery";

async function main() {
	const mailer = MailgunMailer.from({ MAILGUN_API_KEY: "test-key" });
	let payload: Record<string, unknown> | undefined;
	(mailer as unknown as { client: unknown }).client = {
		messages: {
			create: async (_domain: string, body: Record<string, unknown>) => {
				payload = body;
				return { id: "<test@example.com>" };
			},
		},
	};
	const result = await mailer.sendEmail(["sender@example.com"], {
		from: "support@example.com",
		subject: "Away",
		text: "Back soon",
		html: "",
		inReplyTo: "<original@example.com>",
		references: ["<original@example.com>"],
		headers: vacationHeaders,
	});
	assert.equal(result.success, true);
	assert.equal(payload?.["h:Auto-Submitted"], "auto-replied");
	assert.equal(payload?.["h:X-Auto-Response-Suppress"], "All");
	assert.equal(payload?.["h:In-Reply-To"], "<original@example.com>");
	console.log("Passed Mailgun outbound header contract");
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
