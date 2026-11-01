import { db, messages, mailboxThreads, mailboxes, identities, workspaces } from "@db";
import { messagesSearchSchema } from "@schema";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import {and, asc, eq, gt} from "drizzle-orm";
import client from "../../lib/get-typesense";
import { toSearchDoc } from "./search-common";

const BATCH_SIZE = 100;

export const rebuild = async () => {
	console.info("[typesense] rebuilding collection…");

	try {
		await client.collections("messages").delete();
	} catch {}

	await client.collections().create(messagesSearchSchema);
	console.info("[typesense] created collection messages");


	let lastId: string | null = null;
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

				identityPublicId: identities.publicId,
				mailboxSlug: mailboxes.slug,
				workspacePublicId: workspaces.publicId,
			})
			.from(messages)
			.leftJoin(
				mailboxThreads,
				and(
					eq(messages.threadId, mailboxThreads.threadId),
					eq(messages.mailboxId, mailboxThreads.mailboxId),
				),
			)
			.innerJoin(mailboxes, eq(messages.mailboxId, mailboxes.id))
			.innerJoin(identities, eq(mailboxes.identityId, identities.id))
			.innerJoin(workspaces, eq(identities.workspaceId, workspaces.id))
			.where(lastId ? gt(messages.id, lastId) : undefined)
			.orderBy(asc(messages.id))
			.limit(BATCH_SIZE);

		if (batch.length === 0) break;

		const docs = batch.map((row) => {
			const m = row.m;

			return toSearchDoc({
				id: m.id,
				ownerId: m.ownerId,
				mailboxId: m.mailboxId,
				threadId: m.threadId,

				workspacePublicId: row.workspacePublicId,
				identityPublicId: row.identityPublicId,
				mailboxSlug: row.mailboxSlug ?? "inbox",

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
				lastInThreadAt: row.mt_lastActivityAt ?? m.date,

				threadParticipants: row.mt_participants ?? null,
				threadStarred: !!row.mt_starred,

				labels: [],
			});
		});


		try {
			await client.collections("messages").documents().import(docs, { action: "upsert" });
		} catch (err: any) {
			if (!Array.isArray(err.importResults)) throw err;

			const failed = err.importResults
				.map((result: any, index: number) => ({
					...result,
					messageId: docs[index]?.id,
				}))
				.filter((result: any) => result.success !== true);

			console.error("[typesense] failed documents", failed);
		}


		imported += docs.length;
		lastId = batch[batch.length - 1].m.id;

		console.log(`[typesense] upserted ${imported}`);
	}

	console.log("[typesense] indexing done");
};
