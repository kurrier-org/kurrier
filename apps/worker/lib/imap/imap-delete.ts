import { ImapFlow } from "imapflow";
import { initSmtpClient } from "./imap-client";

import { db, messages, mailboxThreads, mailboxes, threads } from "@db";
import { and, eq, inArray, notExists, sql } from "drizzle-orm";

/** Helper: delete UIDs in a mailbox (IMAP) safely under a lock */
async function deleteUids(
	client: ImapFlow,
	mailboxPath: string,
	uids: number[],
) {
	if (!uids.length) return;
	const lock = await client.getMailboxLock(mailboxPath);
	try {
		await client.messageDelete(uids, { uid: true });
	} finally {
		lock.release();
	}
}

/** Helper: extract { path -> [uids] } from message rows (metaData.imap.{uid, mailboxPath}) */
function collectUidsByMailboxPath(
	rows: Array<{ meta: unknown }>,
): Map<string, number[]> {
	const byPath = new Map<string, number[]>();
	for (const r of rows) {
		const imap = (r.meta as any)?.imap;
		const path = imap?.mailboxPath as string | undefined;
		const uid = Number(imap?.uid);
		if (!path || !uid) continue;
		if (!byPath.has(path)) byPath.set(path, []);
		byPath.get(path)!.push(uid);
	}
	return byPath;
}

export async function deleteMail(
	data: {
		mailboxId: string;
		threadId?: string | string[];
		emptyAll?: boolean;
		imapDelete: boolean;
	},
	imapInstances: Map<string, ImapFlow>,
) {
	const { mailboxId, emptyAll, imapDelete } = data;
	if (!mailboxId) return;

	// 1) Resolve mailbox + IMAP client for the owning identity
	const [box] = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.id, mailboxId));
	if (!box) return;

	// Read IMAP path (fallback to mailbox name if meta is missing)
	const mailboxPath: string =
		(box.metaData as any)?.imap?.path || box.name || "";

	let client;
	if (imapDelete) {
		client = await initSmtpClient(box.identityId, imapInstances);
		if (!client?.authenticated || !client.usable) return;
	}

	if (emptyAll) {
		// --- IMAP side ---
		if (imapDelete && client) {
			try {
				const lock = await client.getMailboxLock(String(mailboxPath));
				try {
					// returns number[] | false -> normalize to []
					const allUids: number[] =
						(await client.search({ all: true }, { uid: true })) || [];
					if (allUids.length) {
						await client.messageDelete(allUids, { uid: true });
					}
				} finally {
					lock.release();
				}
			} catch (err) {
				console.error("[deleteMail] emptyAll IMAP delete failed:", err);
				// continue to DB cleanup to keep local state consistent
			}
		}

		// --- DB side ---
		// gather message ids + affected threads for this mailbox
		const rows = await db
			.select({ id: messages.id, threadId: messages.threadId })
			.from(messages)
			.where(eq(messages.mailboxId, mailboxId));

		const allMessageIds = rows.map((r) => r.id);
		const affectedThreadIds = Array.from(new Set(rows.map((r) => r.threadId)));

		await db.transaction(async (tx) => {
			if (allMessageIds.length) {
				await tx.delete(messages).where(inArray(messages.id, allMessageIds));
			}
			if (affectedThreadIds.length) {
				// remove per-mailbox projections
				await tx
					.delete(mailboxThreads)
					.where(
						and(
							eq(mailboxThreads.mailboxId, mailboxId),
							inArray(mailboxThreads.threadId, affectedThreadIds),
						),
					);

				// remove orphan threads (no messages anywhere)
				await tx
					.delete(threads)
					.where(
						and(
							inArray(threads.id, affectedThreadIds),
							notExists(
								tx
									.select({ one: sql`1` })
									.from(messages)
									.where(eq(messages.threadId, threads.id)),
							),
						),
					);
			}
		});

		return;
	}

	// ============== B) DELETE BY THREAD ID(S) ==================
	const threadIds = Array.isArray(data.threadId)
		? data.threadId.filter(Boolean)
		: data.threadId
			? [data.threadId]
			: [];

	if (!threadIds.length) return;

	// --- IMAP side ---
	// fetch messages in these threads for this mailbox to collect UIDs
	const msgRows = await db
		.select({
			id: messages.id,
			threadId: messages.threadId,
			meta: messages.metaData,
		})
		.from(messages)
		.where(
			and(
				eq(messages.mailboxId, mailboxId),
				inArray(messages.threadId, threadIds),
			),
		);

	if (imapDelete && client) {
		// delete on IMAP grouped by mailboxPath
		try {
			const byPath = collectUidsByMailboxPath(msgRows);
			for (const [path, uids] of byPath) {
				if (!uids.length) continue;
				await deleteUids(client, path, uids);
			}
		} catch (err) {
			console.error("[deleteMail] IMAP per-thread delete failed:", err);
			// proceed with DB cleanup; delta sync can reconcile later
		}
	}

	// --- DB side ---
	const allMessageIds = msgRows.map((r) => r.id);

	await db.transaction(async (tx) => {
		if (allMessageIds.length) {
			await tx.delete(messages).where(inArray(messages.id, allMessageIds));
		}

		// remove per-mailbox projections for just these threads in this mailbox
		await tx
			.delete(mailboxThreads)
			.where(
				and(
					eq(mailboxThreads.mailboxId, mailboxId),
					inArray(mailboxThreads.threadId, threadIds),
				),
			);

		// remove orphan threads (no messages anywhere)
		await tx
			.delete(threads)
			.where(
				and(
					inArray(threads.id, threadIds),
					notExists(
						tx
							.select({ one: sql`1` })
							.from(messages)
							.where(eq(messages.threadId, threads.id)),
					),
				),
			);
	});
}
