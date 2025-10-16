import { defineEventHandler, readBody } from "h3";
import { simpleParser } from "mailparser";
import { db, identities, mailboxes } from "@db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { parseAndStoreEmail } from "../../../../../../lib/message-payload-parser";
import { getPublicEnv, getServerEnv } from "@schema";
import { createClient } from "@supabase/supabase-js";
import { getToEmails } from "../sendgrid/inbound.post";

const publicConfig = getPublicEnv();
const serverConfig = getServerEnv();
const supabase = createClient(
	publicConfig.API_URL,
	serverConfig.SERVICE_ROLE_KEY,
);

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

		const encoder = new TextEncoder();
		const emailBuffer = encoder.encode(rawMime);

		const emlId = uuidv4();
		const supaRes = await supabase.storage
			.from("attachments")
			.upload(`eml/${identity.ownerId}/${emlId}`, emailBuffer, {
				contentType: "message/rfc822",
			});

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
			mailboxId: authSaysJunk ? String(spamMb?.id) : String(inbox?.id),
			rawStorageKey: String(supaRes?.data?.path),
			emlKey: emlId,
		});

		return { ok: true };
	} catch (err) {
		console.error("[Webhook] Mailgun inbound error", err);
		return { ok: false };
	}
});
