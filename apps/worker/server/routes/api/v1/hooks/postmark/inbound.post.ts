import { defineEventHandler, readBody } from "h3";
import { db, identities, mailboxes } from "@db";

import { simpleParser } from "mailparser";
import { eq } from "drizzle-orm";
import { getPublicEnv, getServerEnv } from "@schema";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { parseAndStoreEmail } from "../../../../../../lib/message-payload-parser";
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

		const rawMime = (body.RawEmail as Buffer).toString("utf8");
		const parsed = await simpleParser(rawMime);

		const toAddress = getToEmails(parsed)[0] ?? null;

		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.value, toAddress));

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

		const authRes = String(headers.get("authentication-results") ?? "");
		const spfFail = /spf=\s*fail/i.test(authRes);
		const dkimFail = /dkim=\s*fail/i.test(authRes);
		const dmarcFail = /dmarc=\s*fail/i.test(authRes);
		const spamStatus = String(headers.get("x-spam-status") ?? "");

		const authSaysJunk: boolean =
			(spfFail && dkimFail && dmarcFail) ||
			dmarcFail ||
			/^yes\b/i.test(spamStatus);

		await parseAndStoreEmail(rawMime, {
			ownerId: identity.ownerId,
			mailboxId: authSaysJunk ? String(spamMb?.id) : String(inbox?.id),
			rawStorageKey: String(supaRes?.data?.path),
			emlKey: emlId,
		});

		return { ok: true };
	} catch (err) {
		console.error("[Webhook] Error:", err);
		return { ok: true };
	}
});
