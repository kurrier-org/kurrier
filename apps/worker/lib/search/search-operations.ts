import client from "../../lib/get-typesense";
import { messagesSearchSchema } from "@schema";
import { db, mailboxThreads, messages } from "@db";
import { toSearchDoc } from "../../lib/search/search-common";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import { and, eq } from "drizzle-orm";

let collectionReady = false;

async function ensureCollection() {
	if (collectionReady) return;
	try {
		await client.collections("messages").retrieve();
	} catch {
		await client.collections().create(messagesSearchSchema);
	}
	collectionReady = true;
}

type JoinedRow = {
	m: typeof messages.$inferSelect;
	mt_subject?: string | null;
	mt_preview?: string | null;
	mt_lastActivityAt?: Date | null;
	mt_messageCount?: number | null;
	mt_unreadCount?: number | null;
	mt_hasAttachments?: boolean | null;
	mt_participants?: any | null;
	mt_starred?: boolean | null;
};

/** Convert one joined row to a Typesense doc */
function rowToDoc(row: JoinedRow) {
	const m = row.m;
	return toSearchDoc({
		id: m.id,
		ownerId: m.ownerId,
		mailboxId: m.mailboxId,
		threadId: m.threadId,

		subject: m.subject ?? row.mt_subject ?? "",
		text: m.text,
		html: m.html,

		fromName: getMessageName(m, "from"),
		fromEmail: getMessageAddress(m, "from"),

		from: m.from,
		to: m.to,
		cc: m.cc,
		bcc: m.bcc,

		hasAttachments: m.hasAttachments || !!row.mt_hasAttachments,
		seen: m.seen,
		sizeBytes: m.sizeBytes,

		createdAt: m.date,
		lastInThreadAt: m.date,

		threadPreview: row.mt_preview ?? null,
		threadLastActivityAt: row.mt_lastActivityAt ?? null,
		threadParticipants: row.mt_participants ?? null,
		threadStarred: !!row.mt_starred,

		labels: [],
	});
}

/** Load one message + its thread summary */
async function fetchJoinedByMessageId(
	messageId: string,
): Promise<JoinedRow | null> {
	const rows = await db
		.select({
			m: messages,
			mt_subject: mailboxThreads.subject,
			mt_preview: mailboxThreads.previewText,
			mt_lastActivityAt: mailboxThreads.lastActivityAt,
			mt_messageCount: mailboxThreads.messageCount,
			mt_unreadCount: mailboxThreads.unreadCount,
			mt_hasAttachments: mailboxThreads.hasAttachments,
			mt_participants: mailboxThreads.participants,
			mt_starred: mailboxThreads.starred,
		})
		.from(messages)
		.leftJoin(
			mailboxThreads,
			and(
				eq(messages.threadId, mailboxThreads.threadId),
				eq(messages.mailboxId, mailboxThreads.mailboxId), // ✅ ensure mailbox-scoped join
			),
		)
		.where(eq(messages.id, messageId))
		.limit(1);

	return rows[0] ?? null;
}

/** Upsert a single message into Typesense */
export async function indexMessage(messageId: string) {
	const row = await fetchJoinedByMessageId(messageId);
	if (!row) return;
	const doc = rowToDoc(row);
	await ensureCollection();
	await client.collections("messages").documents().upsert(doc);
}

/** Delete a single message from Typesense */
export async function deleteMessage(messageId: string) {
	await ensureCollection();
	try {
		await client.collections("messages").documents(messageId).delete();
	} catch {
		// ignore if not present
	}
}

/** Re-index ALL messages in a thread (needed if thread-level fields changed) */
export async function refreshThread(threadId: string) {
	const threadRows = await db
		.select({
			m: messages,
			mt_subject: mailboxThreads.subject,
			mt_preview: mailboxThreads.previewText,
			mt_lastActivityAt: mailboxThreads.lastActivityAt,
			mt_messageCount: mailboxThreads.messageCount,
			mt_unreadCount: mailboxThreads.unreadCount,
			mt_hasAttachments: mailboxThreads.hasAttachments,
			mt_participants: mailboxThreads.participants,
			mt_starred: mailboxThreads.starred,
		})
		.from(messages)
		.leftJoin(
			mailboxThreads,
			and(
				eq(messages.threadId, mailboxThreads.threadId),
				eq(messages.mailboxId, mailboxThreads.mailboxId), // ✅ consistent join
			),
		)
		.where(eq(messages.threadId, threadId));

	if (threadRows.length === 0) return;

	const docs = threadRows.map(rowToDoc);
	await ensureCollection();
	await client
		.collections("messages")
		.documents()
		.import(docs, { action: "upsert" });
}
