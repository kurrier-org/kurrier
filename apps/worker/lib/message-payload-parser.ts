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
    contacts,
    ContactCreate, mailSubscriptions,
} from "@db";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@schema";
import { generateSnippet, upsertMailboxThreadItem } from "@common";
import { randomUUID } from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getRedis } from "../lib/get-redis";
import slugify from "@sindresorhus/slugify";

const publicConfig = getPublicEnv();
const serverConfig = getServerEnv();
const supabase = createClient(
	publicConfig.API_URL,
	serverConfig.SERVICE_ROLE_KEY,
);

const SEARCH_BATCH_SIZE = 100;
const WEBHOOK_BATCH_SIZE = 100;
const CALENDAR_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;

type SearchJob = {
	messageId: string;
	contactId: string | null;
	ownerId?: string;
};
type WebhookJob = { message: any; rawEmail: string };
type ICSJob = {
	messageId: string;
	messageAttachmentId: string;
	mailboxId: string;
};

let searchBuffer: SearchJob[] = [];
let webhookBuffer: WebhookJob[] = [];
let icsBuffer: ICSJob[] = [];
let flushTimer: any = null;

async function flushBatches() {
	if (!searchBuffer.length && !webhookBuffer.length && !icsBuffer.length)
		return;

	try {
		const { searchIngestQueue, commonWorkerQueue, davWorkerQueue } =
			await getRedis();

		if (searchBuffer.length) {
			const messageIds = searchBuffer.map((job) => job.messageId);
			const contactIds = searchBuffer.map((job) => job.contactId);
			const ownerId = searchBuffer[0].ownerId;

			await searchIngestQueue.add(
				"addBatch",
				{ messageIds },
				{ removeOnComplete: true },
			);
			await davWorkerQueue.add(
				"dav:create-contacts-batch",
				{ contactIds: contactIds, ownerId },
				{ removeOnComplete: true, removeOnFail: true },
			);
			searchBuffer = [];
		}

		if (icsBuffer.length) {
			await davWorkerQueue.add(
				"dav:calendar:itip-ingest-batch",
				{
					items: icsBuffer.map((job) => ({
						messageId: job.messageId,
						messageAttachmentId: job.messageAttachmentId,
						mailboxId: job.mailboxId,
					})),
				},
				{
					removeOnComplete: true,
					removeOnFail: true,
				},
			);

			icsBuffer = [];
		}

		if (webhookBuffer.length) {
			const jobs = webhookBuffer.map((job) => ({
				name: "webhook:message.received",
				data: {
					message: job.message,
					rawEmail: job.rawEmail,
				},
			}));

			await commonWorkerQueue.addBulk(jobs);
			webhookBuffer = [];
		}
	} catch (err: any) {
		console.error(
			"[parseAndStoreEmail] Error flushing batches:",
			err?.message ?? err,
		);
	}
}

function scheduleFlush() {
	if (flushTimer) return;
	flushTimer = setTimeout(async () => {
		flushTimer = null;
		await flushBatches();
	}, FLUSH_INTERVAL_MS);
}

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

function getFromAddress(parsed: ParsedMail) {
	const from = parsed.from?.value?.[0];
	if (!from?.address) return null;
	return {
		email: from.address.trim().toLowerCase(),
		name: (from.name || "").trim() || null,
	};
}

export async function upsertContactsFromMessage(
	ownerId: string,
	parsed: ParsedMail,
) {
	const addr = getFromAddress(parsed);
	if (!addr) return null;

	let contactId: string | null = null;
	const email = addr.email;
	const displayName = addr.name;

	const existing = await db
		.select()
		.from(contacts)
		.where(
			and(
				eq(contacts.ownerId, ownerId),
				sql`${contacts.emails}::jsonb @> ${JSON.stringify([
					{ address: email },
				])}::jsonb`,
			),
		)
		.limit(1);

	if (existing.length === 0) {
		let firstName = "Unknown";
		let lastName: string | null = null;

		if (displayName) {
			const parts = displayName.split(" ").filter(Boolean);
			firstName = parts[0] || "Unknown";
			lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
		}

		const newContact = {
			ownerId,
			firstName,
			lastName,
			emails: [{ address: email }],
			slug: slugify(displayName || email),
			profilePictureXs: null,
		};

		const inserted = await db
			.insert(contacts)
			.values(newContact as ContactCreate)
			.onConflictDoNothing()
			.returning();

		if (inserted.length > 0) {
			contactId = inserted[0].id;
			return contactId;
		}

		const [existingAfter] = await db
			.select()
			.from(contacts)
			.where(
				and(
					eq(contacts.ownerId, ownerId),
					sql`${contacts.emails}::jsonb @> ${JSON.stringify([
						{ address: email },
					])}::jsonb`,
				),
			)
			.limit(1);

		contactId = existingAfter?.id ?? null;
		return contactId;
	}

	const contact = existing[0];

	const hasName = contact.firstName || contact.lastName;
	if (hasName || !displayName) {
		return contact.id;
	}

	const parts = displayName.split(" ").filter(Boolean);
	const firstName = parts[0] || contact.firstName || "Unknown";
	const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

	await db
		.update(contacts)
		.set({
			firstName,
			lastName,
		})
		.where(eq(contacts.id, contact.id));

	contactId = contact.id;
	return contactId;
}

function isIcsAttachment(att: Attachment) {
	const ct = (att.contentType || "").toLowerCase();
	const name = (att.filename || "").toLowerCase();

	return (
		ct.startsWith("text/calendar") ||
		ct === "application/ics" ||
		name.endsWith(".ics")
	);
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
		mode?: "live" | "backfill";
	},
) {
	const { ownerId, mailboxId, rawStorageKey } = opts;
	const mode = opts.mode ?? "live";

	const parsed = await simpleParser(rawEmail);
	const headers = parsed.headers as Map<string, any>;

	const encoder = new TextEncoder();
	const emailBuffer = encoder.encode(rawEmail);

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

	if (typeof opts.seen === "boolean") {
		(decoratedParsed as any).seen = opts.seen;
	}
	if (typeof opts.answered === "boolean") {
		(decoratedParsed as any).answered = opts.answered;
	}
	if (typeof opts.flagged === "boolean") {
		(decoratedParsed as any).flagged = opts.flagged;
	}

	const messagePayload = MessageInsertSchema.parse(decoratedParsed);
	const [message] = await db
		.insert(messages)
		.values(messagePayload as MessageCreate)
		.onConflictDoNothing({
			target: [messages.mailboxId, messages.messageId],
		})
		.returning();

	if (!message) return null;
    await ingestMailSubscriptionFromMessage({
        ownerId,
        parsed,
        headersJson: (decoratedParsed as any).headersJson,
    });

	const contactId = await upsertContactsFromMessage(ownerId, parsed);
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

	const seenIcsChecksums = new Set<string>();

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
		const [newAttachment] = await db
			.insert(messageAttachments)
			.values(parsedRow)
			.returning();

		if (mode === "live" && isIcsAttachment(attachment)) {
			const key =
				attachment.checksum || `${attachment.size}:${attachment.contentType}`;
			if (!seenIcsChecksums.has(key)) {
				seenIcsChecksums.add(key);
				icsBuffer.push({
					messageId: message.id,
					messageAttachmentId: newAttachment.id,
					mailboxId,
				});
				if (icsBuffer.length >= CALENDAR_BATCH_SIZE) {
					await flushBatches();
				} else {
					scheduleFlush();
				}
			}
		}
	}

	searchBuffer.push({
		messageId: message.id,
		contactId: String(contactId),
		ownerId,
	});
	if (searchBuffer.length >= SEARCH_BATCH_SIZE) {
		await flushBatches();
	} else {
		scheduleFlush();
	}

	if (mode === "live") {
		webhookBuffer.push({ message, rawEmail });
		if (webhookBuffer.length >= WEBHOOK_BATCH_SIZE) {
			await flushBatches();
		} else {
			scheduleFlush();
		}
	}

	return message;
}



async function ingestMailSubscriptionFromMessage(opts: {
    ownerId: string;
    parsed: ParsedMail;
    headersJson: Record<string, any>;
}) {
    const { ownerId, parsed, headersJson } = opts;

    const headers = parsed.headers as Map<string, any>;
    const list =
        (headers.get("list") as any) ??
        (headersJson as any)?.list ??
        null;

    const rawListId =
        String(headers.get("list-id") ?? (headersJson as any)?.["list-id"] ?? "")
            .trim() || null;

    const unsubscribeUrl =
        (list?.unsubscribe?.url as string | undefined) ||
        (list?.unsubscribe?.href as string | undefined) ||
        null;

    const unsubscribePost =
        String(list?.["unsubscribe-post"]?.name ?? "").toLowerCase() || null;

    let unsubscribeMailto: string | null = null;
    const rawListUnsub = headers.get("list-unsubscribe") ?? (headersJson as any)?.["list-unsubscribe"];
    if (typeof rawListUnsub === "string" && rawListUnsub.toLowerCase().includes("mailto:")) {
        const m = rawListUnsub.match(/mailto:([^>\s,]+)/i);
        unsubscribeMailto = (m?.[1] ?? "").trim().toLowerCase() || null;
    }

    if (!rawListId && !unsubscribeUrl && !unsubscribeMailto) return;

    let subscriptionKey: string | null = null;

    if (rawListId) {
        const cleaned = rawListId
            .replace(/^<|>$/g, "")
            .replace(/\s+/g, "")
            .toLowerCase();
        subscriptionKey = cleaned ? `list-id:${cleaned}` : null;
    } else if (unsubscribeUrl) {
        try {
            const u = new URL(unsubscribeUrl);
            const p = (u.pathname || "/").replace(/\/+$/, "") || "/";
            subscriptionKey = `${u.protocol}//${u.host}${p}`;
        } catch {
            subscriptionKey = null;
        }
    } else if (unsubscribeMailto) {
        subscriptionKey = `mailto:${unsubscribeMailto}`;
    } else {
        const from = getFromAddress(parsed);
        if (from?.email?.includes("@")) {
            subscriptionKey = `from-domain:${from.email.split("@")[1]}`;
        }
    }

    if (!subscriptionKey) return;

    const oneClick = unsubscribePost?.includes("one-click") ?? false;

    await db
        .insert(mailSubscriptions)
        .values({
            ownerId,
            subscriptionKey,
            listId: rawListId,
            unsubscribeHttpUrl: unsubscribeUrl,
            unsubscribeMailto,
            oneClick,
            lastSeenAt: new Date(),
        } as any)
        .onConflictDoUpdate({
            target: [mailSubscriptions.ownerId, mailSubscriptions.subscriptionKey],
            set: {
                listId: rawListId,
                unsubscribeHttpUrl: unsubscribeUrl,
                unsubscribeMailto,
                oneClick,
                lastSeenAt: new Date(),
            } as any,
        });
}
