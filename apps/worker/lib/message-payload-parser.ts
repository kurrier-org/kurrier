import { simpleParser, ParsedMail, Attachment } from "mailparser";
import {
    db,
    messages,
    messageAttachments,
    threads,
    MessageInsertSchema,
    MessageCreate,
    MessageAttachmentCreate,
    MessageAttachmentInsertSchema,
} from "@db";
import { createClient } from "@supabase/supabase-js";
import {getPublicEnv, getServerEnv} from "@schema";
import {generateSnippet, upsertThreadsListItem} from "@common";
import { randomUUID } from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

const publicConfig = getPublicEnv();
const serverConfig = getServerEnv();
const supabase = createClient(
    publicConfig.SUPABASE_DOMAIN,
    serverConfig.SUPABASE_SERVICE_ROLE_KEY,
);

function generateFileName(att: Attachment) {
	const ext =
		att.filename?.split(".").pop()?.toLowerCase() ||
		att.contentType?.split("/")[1]?.split("+")[0] ||
		"bin";
	return `${randomUUID()}.${ext}`;
}

export async function createOrInitializeThread(
	parsed: ParsedMail & { ownerId: string; mailboxId: string },
) {
	const { ownerId, mailboxId } = parsed;
	const inReplyTo = parsed.inReplyTo?.trim() || null;
	const referencesArr = Array.isArray(parsed.references)
		? parsed.references
		: parsed.references
			? [parsed.references]
			: [];

	const candidates = Array.from(
		new Set(
			[inReplyTo, ...referencesArr].filter(Boolean).map((s) => String(s)),
		),
	);

	return db.transaction(async (tx) => {
		let existingThread = null as null | typeof threads.$inferSelect;

		if (candidates.length > 0) {
			const parentMsgs = await tx
				.select({
					id: messages.id,
					threadId: messages.threadId,
					messageId: messages.messageId,
					date: messages.date,
				})
				.from(messages)
				.where(
					and(
						eq(messages.mailboxId, mailboxId),
						inArray(messages.messageId, candidates),
					),
				)
				.orderBy(desc(messages.date ?? sql`now()`));

			if (parentMsgs.length) {
				const direct = inReplyTo
					? parentMsgs.find((m) => m.messageId === inReplyTo)
					: null;
				const chosen = direct ?? parentMsgs[0];

				if (chosen.threadId) {
					const [t] = await tx
						.select()
						.from(threads)
						.where(
							and(
								eq(threads.id, chosen.threadId),
								eq(threads.mailboxId, mailboxId),
							),
						);
					if (t) existingThread = t;
				}
			}
		}

		if (existingThread) return existingThread;

		const [newThread] = await tx
			.insert(threads)
			.values({
				ownerId,
				mailboxId,
				lastMessageDate: parsed.date ?? new Date(),
			})
			.returning();

		return newThread;
	});
}



// export async function upsertThreadsListItem(messageId: string) {
//     const [msg] = await db
//         .select()
//         .from(messages)
//         .where(eq(messages.id, messageId));
//
//     if (!msg) throw new Error(`Message ${messageId} not found`);
//
//     const [mailbox] = await db
//         .select()
//         .from(mailboxes)
//         .where(eq(mailboxes.id, msg.mailboxId));
//
//     const [identity] = await db
//         .select()
//         .from(identities)
//         .where(eq(identities.id, mailbox.identityId));
//
//     if (!mailbox) throw new Error(`Mailbox ${msg.mailboxId} not found`);
//
//     const subject = msg.subject?.trim() || "(no subject)";
//     const previewText = msg.snippet
//     const lastActivityAt = msg.date ?? msg.createdAt;
//
//     const participants = buildParticipantsSnapshot(msg);
//
//     const payload = {
//         id: msg.threadId,
//         ownerId: mailbox.ownerId,
//         identityId: mailbox.identityId,
//         mailboxId: mailbox.id,
//         identityPublicId: identity.publicId,
//         mailboxSlug: mailbox.slug,
//         subject,
//         previewText,
//         lastActivityAt,
//         firstMessageAt: lastActivityAt,
//         messageCount: 1,
//         unreadCount: msg.seen ? 0 : 1,
//         hasAttachments: msg.hasAttachments,
//         participants,
//     }
//
//     const parsedPayload = ThreadsListInsertSchema.parse(payload);
//     await db
//         .insert(threadsList)
//         .values(parsedPayload)
//         .onConflictDoUpdate({
//             target: threadsList.id,
//             set: {
//                 subject: sql`COALESCE(EXCLUDED.subject, ${threadsList.subject})`,
//                 previewText: sql`COALESCE(EXCLUDED.preview_text, ${threadsList.previewText})`,
//                 lastActivityAt: sql`GREATEST(EXCLUDED.last_activity_at, ${threadsList.lastActivityAt})`,
//                 messageCount: sql`${threadsList.messageCount} + 1`,
//                 unreadCount: sql`${threadsList.unreadCount} + ${msg.seen ? 0 : 1}`,
//                 hasAttachments: sql`${threadsList.hasAttachments} OR ${msg.hasAttachments}`,
//                 participants: sql`jsonb_strip_nulls(${threadsList.participants} || EXCLUDED.participants)`,
//                 updatedAt: sql`now()`,
//             },
//         });
//
//     return { threadId: msg.threadId, mailboxId: mailbox.id };
// }


// function buildParticipantsSnapshot(msg: any) {
//     const extract = (addrObj?: AddressObjectJSON | null) =>
//         (addrObj?.value ?? [])
//             .map((a) => ({
//                 n: a?.name || null,
//                 e: a?.address || null,
//             }))
//             .filter((x) => x.e)
//             .slice(0, 5);
//
//     return {
//         from: extract(msg.from),
//         to: extract(msg.to),
//         cc: extract(msg.cc),
//         bcc: extract(msg.bcc),
//     };
// }



/**
 * Parse raw email, create thread, insert message + attachments.
 */
export async function parseAndStoreEmail(
	rawEmail: string,
	opts: {
		ownerId: string;
		mailboxId: string;
		rawStorageKey: string;
		emlKey: string;
	},
) {
	const { ownerId, mailboxId, rawStorageKey } = opts;

	const parsed = await simpleParser(rawEmail);
	const headers = parsed.headers as Map<string, any>;

	const encoder = new TextEncoder();
	const emailBuffer = encoder.encode(rawEmail);

	await supabase.storage
		.from("attachments")
		.upload(`eml/${ownerId}/${opts.emlKey}`, emailBuffer, {
			contentType: "message/rfc822",
            upsert: true
		});

	const messageId =
		parsed.messageId || String(headers.get("message-id") || "").trim();

	// if (!messageId) throw new Error("Missing message-id");

	if (!messageId) {
		console.warn(
			`[parseAndStoreEmail] Skipping message with no Message-ID (mailboxId=${mailboxId}, storageKey=${rawStorageKey})`,
		);
		return null;
	}

	const thread = await createOrInitializeThread({
		...parsed,
		ownerId,
		mailboxId,
	});

	const decoratedParsed = {
		...parsed,
		mailboxId,
		threadId: thread.id,
		ownerId,
		headersJson: Object.fromEntries(parsed.headers as Map<string, any>),
		hasAttachments: (parsed.attachments?.length ?? 0) > 0,
		rawStorageKey,
		references: Array.isArray(parsed.references)
			? parsed.references
			: parsed.references
				? [parsed.references]
				: null,
		seen: false,
		answered: false,
		flagged: false,
		draft: false,
		html: parsed.html || "",
        snippet: generateSnippet((parsed.text || parsed.html || ""))
		// snippet: (parsed.text || parsed.html || "")
		// 	.toString()
		// 	.replace(/\s+/g, " ")
		// 	.slice(0, 100),
	} as MessageCreate | ParsedMail;

	const messagePayload = MessageInsertSchema.parse(decoratedParsed);
	const [message] = await db
		.insert(messages)
		.values(messagePayload as MessageCreate)
		// .onConflictDoNothing()
        .onConflictDoNothing({
            target: [messages.mailboxId, messages.messageId],
        })
		.returning();

	if (!message) return null;

    await upsertThreadsListItem(message.id);

	const msgDate = message.createdAt ?? new Date();
	const [t] = await db
		.select({ last: threads.lastMessageDate })
		.from(threads)
		.where(eq(threads.id, thread.id));

	if (!t?.last || new Date(t.last) < msgDate) {
		await db
			.update(threads)
			.set({ lastMessageDate: msgDate })
			.where(eq(threads.id, thread.id));
	}

	for (const attachment of parsed.attachments ?? []) {
		const bucket = "attachments";
		const fileName = generateFileName(attachment);
		const objectPath = `private/${ownerId}/${message.id}/${fileName}`;

		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(objectPath, attachment.content, {
				contentType: attachment.contentType || "application/octet-stream",
				upsert: false,
				cacheControl: "31536000",
			});
		if (error) throw error;

		const candidate: MessageAttachmentCreate = {
			ownerId,
			messageId: message.id,
			bucketId: bucket,
			path: data?.path,
			filenameOriginal: attachment.filename || null,
			contentType: attachment.contentType || "application/octet-stream",
			sizeBytes: Number(attachment.size ?? attachment.content?.length ?? 0),
			checksum: attachment.checksum || null,
			cid: attachment.cid || null,
			isInline:
				attachment.contentDisposition === "inline" || !!attachment.cid || false,
			disposition: attachment.contentDisposition || "attachment",
		} as MessageAttachmentCreate;

		const parsedRow = MessageAttachmentInsertSchema.parse(candidate);
		await db.insert(messageAttachments).values(parsedRow).returning();
	}

	return message;
}
