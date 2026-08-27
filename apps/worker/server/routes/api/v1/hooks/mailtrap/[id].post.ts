import crypto from "node:crypto";
import {
	db,
	decryptAdminSecrets,
	identities,
	mailboxes,
	providerSecrets,
	providers,
} from "@db";
import { and, eq } from "drizzle-orm";
import { defineEventHandler, getHeader, getRouterParam, readRawBody } from "h3";
import { simpleParser } from "mailparser";
import { v4 as uuidv4 } from "uuid";
import { parseAndStoreEmail } from "../../../../../../lib/message-payload-parser";
import { getToEmails } from "../sendgrid/inbound.post";

function safeEqual(a: string, b: string) {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);

	if (ab.length !== bb.length) return false;

	return crypto.timingSafeEqual(ab, bb);
}

function isSignatureValid(
	signatureHeader: string | undefined,
	secret: string | undefined,
	rawBody: string,
): boolean {
	if (!secret || !signatureHeader) return false;

	const expected = crypto
		.createHmac("sha256", secret)
		.update(rawBody)
		.digest("hex");
	return safeEqual(signatureHeader, expected);
}

// Payload shape: { events: [{ event, message_id, inbox_id, ... }] }.
function extractMessageRef(
	body: any,
): { messageId: string; inboxId: string } | null {
	const evt = Array.isArray(body?.events) ? body.events[0] : body;

	const messageId = evt?.message_id;
	const inboxId = evt?.inbox_id ?? evt?.inbound_inbox_id;

	if (!messageId || !inboxId) return null;

	return { messageId: String(messageId), inboxId: String(inboxId) };
}

export default defineEventHandler(async (event) => {
	try {
		const providerId = getRouterParam(event, "id");

		if (!providerId) {
			event.node.res.statusCode = 404;
			return { ok: false, error: "Missing provider id" };
		}

		const [provider] = await db
			.select()
			.from(providers)
			.where(and(eq(providers.id, providerId), eq(providers.type, "mailtrap")));

		if (!provider) {
			event.node.res.statusCode = 404;
			return { ok: false, error: "Mailtrap provider not found" };
		}

		const [providerSecret] = await decryptAdminSecrets({
			linkTable: providerSecrets,
			foreignCol: providerSecrets.providerId,
			secretIdCol: providerSecrets.secretId,
			ownerId: provider.ownerId,
			parentId: providerId,
		});

		const credentials = providerSecret?.vault?.decrypted_secret
			? JSON.parse(providerSecret.vault.decrypted_secret)
			: {};

		const apiToken: string | undefined = credentials.MAILTRAP_API_TOKEN;
		const webhookSecret: string | undefined =
			credentials.MAILTRAP_WEBHOOK_SECRET;

		const rawBody = (await readRawBody(event)) || "";

		if (
			!isSignatureValid(
				getHeader(event, "mailtrap-signature"),
				webhookSecret,
				rawBody,
			)
		) {
			event.node.res.statusCode = 401;
			return { ok: false, error: "Unauthorized" };
		}

		if (!apiToken) {
			console.error(
				"[Webhook] Mailtrap error: provider has no MAILTRAP_API_TOKEN configured",
			);
			return { ok: true };
		}

		const body = JSON.parse(rawBody);
		const ref = extractMessageRef(body);

		if (!ref) {
			console.log(
				"[Webhook] Mailtrap: no message_id/inbox_id in payload, ignoring.",
			);
			return { ok: true };
		}

		const messageMeta: any = await $fetch(
			`https://mailtrap.io/api/inbound/inboxes/${ref.inboxId}/messages/${ref.messageId}`,
			{ headers: { "Api-Token": apiToken } },
		);

		const rawMessageUrl = messageMeta?.raw_message_url;
		if (!rawMessageUrl) {
			console.error(
				"[Webhook] Mailtrap error: no raw_message_url in message metadata",
			);
			return { ok: true };
		}

		const rawMime: string = await $fetch(rawMessageUrl, {
			headers: { "Api-Token": apiToken },
			responseType: "text",
		});

		const parsed = await simpleParser(rawMime);

		const toAddress = getToEmails(parsed)[0] ?? null;

		const [identity] = await db
			.select()
			.from(identities)
			.where(
				and(
					eq(identities.value, toAddress),
					eq(identities.workspaceId, provider.workspaceId),
				),
			);

		if (!identity) {
			console.log("No identity found for toAddress", toAddress);
			return { ok: false, error: "No identity found for toAddress" };
		}

		const emlId = uuidv4();
		const rawStorageKey = `eml/${identity.ownerId}/${emlId}`;

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

		const authSaysJunk: boolean =
			(spfFail && dkimFail && dmarcFail) || dmarcFail;

		await parseAndStoreEmail(rawMime, {
			ownerId: identity.ownerId,
			workspaceId: identity.workspaceId,
			mailboxId: authSaysJunk ? String(spamMb?.id) : String(inbox?.id),
			rawStorageKey,
			emlKey: emlId,
		});

		console.log(
			`[Webhook] Mailtrap: stored message ${ref.messageId} for ${toAddress} (identity ${identity.id})`,
		);

		return { ok: true };
	} catch (err) {
		console.error("[Webhook] Mailtrap inbound error:", err);
		return { ok: true };
	}
});
