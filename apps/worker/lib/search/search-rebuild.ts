import { db, messages, mailboxThreads } from "@db";
import { messagesSearchSchema } from "@schema";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import { and, eq } from "drizzle-orm";
import client from "../../lib/get-typesense";
import { toSearchDoc } from "./search-common"; // ✅ new import

const BATCH_SIZE = 2000;

export const rebuild = async () => {
	console.log("[typesense] rebuilding collection…");

	try {
		await client.collections("messages").delete();
	} catch {}
	await client.collections().create(messagesSearchSchema);
	console.log("[typesense] created collection messages");

	let offset = 0;
	let imported = 0;

	while (true) {
		const batch = await db
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
					eq(messages.mailboxId, mailboxThreads.mailboxId),
				),
			)
			.limit(BATCH_SIZE)
			.offset(offset);

		if (batch.length === 0) break;

		const docs = batch.map((row) => {
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
				threadParticipants: (row.mt_participants as any) ?? null,
				threadStarred: !!row.mt_starred,
				labels: [],
			});
		});

		const result = await client
			.collections("messages")
			.documents()
			.import(docs, { action: "upsert" });

		const failed = result.filter((r: any) => r.success !== true);
		if (failed.length)
			console.warn("[typesense] some docs failed", failed.slice(0, 5));

		imported += docs.length;
		offset += BATCH_SIZE;
		console.log(`[typesense] upserted ${imported}`);
	}

	console.log("[typesense] indexing done");
};
