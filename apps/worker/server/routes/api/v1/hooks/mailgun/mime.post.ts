import { defineEventHandler, readBody } from "h3";
import { simpleParser } from "mailparser";
import { db, identities, mailboxes } from "@db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { parseAndStoreEmail } from "../../../../../../lib/message-payload-parser";
import { getToEmails } from "../sendgrid/inbound.post";

export default defineEventHandler(async (event) => {
	try {
		const body = await readBody(event);
		const rawMime = body["body-mime"];
		const parsed = await simpleParser(rawMime);

		const toAddress = getToEmails(parsed)[0] ?? null;

		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.value, toAddress));

		if (!identity) {
			console.log("No identity found for toAddress", toAddress);
			return { ok: false, error: "No identity found for toAddress" };
		}

		const emlId = uuidv4();

		// Define your raw storage key directly
		const rawStorageKey = `eml/${identity.ownerId}/${emlId}`;

		const headers = parsed.headers as Map<string, any>;

		const userMailboxes = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.identityId, identity.id));

		const inbox = userMailboxes.find((m) => m.kind === "inbox");
		const spamMb = userMailboxes.find((m) => m.kind === "spam");

		const mailgunFlag: string = String(
			headers.get("x-mailgun-sflag") ?? "",
		).toLowerCase();
		const mailgunSaysSpam: boolean = mailgunFlag === "yes";

		const authRes: string = String(headers.get("authentication-results") ?? "");
		const spfFail: boolean = /spf=\s*fail/i.test(authRes);
		const dkimFail: boolean = /dkim=\s*fail/i.test(authRes);
		const dmarcFail: boolean = /dmarc=\s*fail/i.test(authRes);

		const authSaysJunk: boolean =
			mailgunSaysSpam || (spfFail && dkimFail && dmarcFail) || dmarcFail;

		await parseAndStoreEmail(rawMime, {
			ownerId: identity.ownerId,
			workspaceId: identity.workspaceId,
			mailboxId: authSaysJunk ? String(spamMb?.id) : String(inbox?.id),
			rawStorageKey,
			emlKey: emlId,
		});

		return { ok: true };
	} catch (err) {
		console.error("[Webhook] Mailgun inbound error", err);
		return { ok: false };
	}
});
