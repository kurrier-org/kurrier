import { defineEventHandler, readRawBody } from "h3";
import {
	db,
	decryptAdminSecrets,
	mailboxes,
	providers,
	providerSecrets,
} from "@db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

import { simpleParser } from "mailparser";
import { eq } from "drizzle-orm";
import { getPublicEnv, getServerEnv } from "@schema";
import { createClient } from "@supabase/supabase-js";

import { parseAndStoreEmail } from "../../../../../../../lib/message-payload-parser";

// async function createOrInitializeThread(
// 	parsed: ParsedMail & {
// 		ownerId: string;
// 		mailboxId: string;
// 	},
// ) {
// 	const { ownerId, mailboxId } = parsed;
//
// 	// Build candidate parent ids from headers
// 	const inReplyTo = parsed.inReplyTo?.trim() || null;
//
// 	// mailparser can give references as string | string[]
// 	const referencesArr = Array.isArray(parsed.references)
// 		? parsed.references
// 		: parsed.references
// 			? [parsed.references]
// 			: [];
//
// 	// Only keep well-formed <...> Message-IDs and dedupe
// 	const candidates = Array.from(
// 		new Set(
// 			[inReplyTo, ...referencesArr].filter(Boolean).map((s) => String(s)),
// 		),
// 	);
//
// 	// In a transaction so thread creation is atomic
// 	return db.transaction(async (tx) => {
// 		// Try direct parent first (inReplyTo), then fall back to any reference,
// 		// newest first if multiple hit.
// 		let existingThread = null as null | typeof threads.$inferSelect;
//
// 		if (candidates.length > 0) {
// 			const parentMsgs = await tx
// 				.select({
// 					id: messages.id,
// 					threadId: messages.threadId,
// 					messageId: messages.messageId,
// 					date: messages.date,
// 				})
// 				.from(messages)
// 				.where(
// 					and(
// 						eq(messages.mailboxId, mailboxId),
// 						inArray(messages.messageId, candidates),
// 					),
// 				)
// 				.orderBy(desc(messages.date ?? sql`now()`));
//
// 			if (parentMsgs.length) {
// 				// Prefer the exact inReplyTo match, otherwise take the most recent hit
// 				const direct = inReplyTo
// 					? parentMsgs.find((m) => m.messageId === inReplyTo)
// 					: null;
// 				const chosen = direct ?? parentMsgs[0];
//
// 				if (chosen.threadId) {
// 					const [t] = await tx
// 						.select()
// 						.from(threads)
// 						.where(
// 							and(
// 								eq(threads.id, chosen.threadId),
// 								eq(threads.mailboxId, mailboxId),
// 							),
// 						);
// 					if (t) existingThread = t;
// 				}
// 			}
// 		}
//
// 		if (existingThread) {
// 			return existingThread;
// 		}
//
// 		// No parent found → create a new thread (minimal fields)
// 		const [newThread] = await tx
// 			.insert(threads)
// 			.values({
// 				ownerId,
// 				mailboxId,
// 				lastMessageDate: parsed.date ?? new Date(),
// 				// messageCount can be incremented after you insert the message
// 			})
// 			.returning();
//
// 		return newThread;
// 	});
// }

const publicConfig = getPublicEnv();
const serverConfig = getServerEnv();
const supabase = createClient(
	publicConfig.SUPABASE_PUBLIC_URL,
	serverConfig.SERVICE_ROLE_KEY,
);

export default defineEventHandler(async (event) => {
	try {
		const raw = (await readRawBody(event)) || "";
		const sns = JSON.parse(raw as string);

		// 1) One-time SNS handshake
		if (sns?.Type === "SubscriptionConfirmation" && sns.SubscribeURL) {
			await $fetch(sns.SubscribeURL as string, { method: "GET" });
			console.log("[Webhook] SNS subscription confirmed");
			return { ok: true };
		}

		// 2) Normal notifications (S3 → SNS). We expect Message to be the S3 event JSON
		if (sns?.Type === "Notification" && sns?.Message) {
			const msg =
				typeof sns.Message === "string" ? JSON.parse(sns.Message) : sns.Message;
			const rec = msg?.Records?.[0];
			if (!rec || rec.eventSource !== "aws:s3") {
				console.log("[Webhook] Non-S3 notification, ignoring.");
				return { ok: true };
			}

			const bucket: string = rec.s3?.bucket?.name;
			const key: string = decodeURIComponent(rec.s3?.object?.key || "");
			const size: number = rec.s3?.object?.size ?? 0;

			console.log("[S3] ObjectCreated:", { bucket, key, size });

			const [, ownerId, providerId, identityId, emlId] = key.split("/");
			const [secrets] = await decryptAdminSecrets({
				linkTable: providerSecrets,
				foreignCol: providerSecrets.providerId,
				secretIdCol: providerSecrets.secretId,
				ownerId,
				parentId: providerId,
			});

			const vaultValues = secrets?.vault?.decrypted_secret
				? JSON.parse(secrets.vault.decrypted_secret)
				: {};

			const s3 = new S3Client({
				region: vaultValues.SES_REGION,
				credentials: {
					accessKeyId: vaultValues.SES_ACCESS_KEY_ID,
					secretAccessKey: vaultValues.SES_SECRET_ACCESS_KEY,
				},
			});

			const getObj = await s3.send(
				new GetObjectCommand({ Bucket: bucket, Key: key }),
			);
			const rawEmail = (await getObj?.Body?.transformToString("utf-8")) || "";
			const encoder = new TextEncoder();
			const emailBuffer = encoder.encode(rawEmail);

			await supabase.storage
				.from("attachments")
				.upload(`eml/${ownerId}/${emlId}`, emailBuffer, {
					contentType: "message/rfc822",
				});

			const parsed = await simpleParser(rawEmail);
			const headers = parsed.headers as Map<string, any>;

			console.dir(parsed, { depth: 10 });

			// const messageId =
			// 	parsed.messageId || String(headers.get("message-id") || "").trim();
			// if (!messageId) throw new Error("Missing message-id");

			const userMailboxes = await db
				.select()
				.from(mailboxes)
				.where(eq(mailboxes.identityId, identityId));

			const inbox = userMailboxes.find((m) => m.kind === "inbox");
			const spamMb = userMailboxes.find((m) => m.kind === "spam");
			// const junkMb = userMailboxes.find(m => m.kind === "junk");
			const [provider] = await db
				.select()
				.from(providers)
				.where(eq(providers.id, providerId));

			if (!inbox)
				throw new Error("No inbox mailbox found for identity " + identityId);
			if (!spamMb)
				throw new Error("No spam mailbox found for identity " + identityId);
			if (!provider) throw new Error("No provider found for id " + providerId);

			let providerSaysSpam = false;
			if (provider?.type === "ses") {
				const spamVerdict = String(headers.get("x-ses-spam-verdict") ?? "")
					.trim()
					.toUpperCase();
				const virusVerdict = String(headers.get("x-ses-virus-verdict") ?? "")
					.trim()
					.toUpperCase();
				// mark as spam if either is not PASS
				providerSaysSpam =
					(spamVerdict !== "" && spamVerdict !== "PASS") ||
					(virusVerdict !== "" && virusVerdict !== "PASS");
			}

			const authRes = String(headers.get("authentication-results") ?? "");
			const spfFail = /spf=\s*fail/i.test(authRes);
			const dkimFail = /dkim=\s*fail/i.test(authRes);
			const dmarcFail = /dmarc=\s*fail/i.test(authRes);
			const authSaysJunk = (spfFail && dkimFail && dmarcFail) || dmarcFail;

			console.log("providerSaysSpam", providerSaysSpam);
			console.log("authSaysJunk", authSaysJunk);

			let targetMailboxId = inbox.id;
			if (providerSaysSpam && spamMb) {
				targetMailboxId = spamMb.id;
			}
			// else if (authSaysJunk && junkMb)       targetMailboxId = junkMb.id;

			console.log(
				"****************************************************************",
			);
			console.log(
				"****************************************************************",
			);
			console.log(
				"****************************************************************",
			);

			await parseAndStoreEmail(rawEmail, {
				ownerId,
				mailboxId: targetMailboxId,
				rawStorageKey: key, // S3 key
				emlKey: emlId,
			});

			const channel = await supabase.channel(`${ownerId}-mailbox`);

			channel.subscribe((status) => {
				if (status !== "SUBSCRIBED") {
					return null;
				}
				channel.send({
					type: "broadcast",
					event: "mail-received",
					payload: { reload: true },
				});
				channel.unsubscribe();
				return;
			});

			// Optional: fetch the raw RFC822 now (you can move this to a worker if preferred)
			// const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
			// const rawEmail = await obj.Body?.transformToString(); // Node 18+ SDK helper
			// TODO: enqueue or parse with `mailparser` here

			// TODO: insert a lightweight row to your DB linking to {bucket, key}
			// (so the UI can list messages immediately while a worker parses content)

			return { ok: true };
		}

		// 3) Anything else
		console.log("[Webhook] Ignored payload shape.");
		return { ok: true };
	} catch (err) {
		console.error("[Webhook] Error:", err);
		return { ok: true };
	}
});
