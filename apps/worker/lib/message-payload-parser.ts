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
import { getPublicEnv, getServerEnv } from "@schema";
import { generateSnippet, upsertMailboxThreadItem } from "@common";
import { randomUUID } from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getRedis } from "./get-redis";

const publicConfig = getPublicEnv();
const serverConfig = getServerEnv();
const supabase = createClient(
	publicConfig.API_URL,
	serverConfig.SERVICE_ROLE_KEY,
);

function generateFileName(att: Attachment) {
	const ext =
		att.filename?.split(".").pop()?.toLowerCase() ||
		att.contentType?.split("/")[1]?.split("+")[0] ||
		"bin";
	return `${randomUUID()}.${ext}`;
}

export async function createOrInitializeThread(
	parsed: ParsedMail & { ownerId: string },
) {
	const { ownerId } = parsed;
	const inReplyTo = parsed.inReplyTo?.trim() || null;
	const refs = Array.isArray(parsed.references)
		? parsed.references
		: parsed.references
			? [parsed.references]
			: [];
	// const candidates = Array.from(new Set([inReplyTo, ...refs].filter(Boolean)));
	const candidates = Array.from(
		new Set([inReplyTo, ...refs].filter(Boolean).map((s) => String(s))),
	);

	return db.transaction(async (tx) => {
		let existingThread = null;

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
						eq(messages.ownerId, ownerId),
						inArray(messages.messageId, candidates),
					),
				)
				.orderBy(desc(messages.date ?? sql`now()`));

			if (parentMsgs.length) {
				const chosen = inReplyTo
					? parentMsgs.find((m) => m.messageId === inReplyTo)
					: parentMsgs[0];

				if (chosen?.threadId) {
					const [t] = await tx
						.select()
						.from(threads)
						.where(eq(threads.id, chosen.threadId));
					if (t) existingThread = t;
				}
			}
		}

		if (existingThread) return existingThread;

		const [newThread] = await tx
			.insert(threads)
			.values({
				ownerId,
				lastMessageDate: parsed.date ?? new Date(),
			})
			.returning();

		return newThread;
	});
}

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
		metaData?: Record<string, any>;
		seen?: boolean;
		answered?: boolean;
		flagged?: boolean;
	},
) {
	const { ownerId, mailboxId, rawStorageKey } = opts;

	const parsed = await simpleParser(rawEmail);
	const headers = parsed.headers as Map<string, any>;

	const encoder = new TextEncoder();
	const emailBuffer = encoder.encode(rawEmail);

	console.dir(opts, { depth: 10 });

	await supabase.storage
		.from("attachments")
		.upload(opts.rawStorageKey, emailBuffer, {
			contentType: "message/rfc822",
			upsert: true,
		});

	const messageId =
		parsed.messageId || String(headers.get("message-id") || "").trim();

	if (!messageId) {
		console.warn(
			`[parseAndStoreEmail] Skipping message with no Message-ID (mailboxId=${mailboxId}, storageKey=${rawStorageKey})`,
		);
		return null;
	}

	const thread = await createOrInitializeThread({
		...parsed,
		ownerId,
		// mailboxId,
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
		snippet: generateSnippet(parsed.text || parsed.html || ""),
	} as MessageCreate | ParsedMail;

	if (opts.metaData) {
		(decoratedParsed as any).metaData = opts.metaData;
	}
	if (opts.seen) {
		(decoratedParsed as any).seen = opts.seen;
	}
	if (opts.answered) {
		(decoratedParsed as any).answered = opts.answered;
	}
	if (opts.flagged) {
		(decoratedParsed as any).flagged = opts.flagged;
	}

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

	await upsertMailboxThreadItem(message.id);

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

	const { searchIngestQueue } = await getRedis();
	await searchIngestQueue.add(
		"add",
		{ messageId: message.id },
		{ removeOnComplete: true },
	);

	return message;
}
