import { db, mailboxes, messages, mailboxThreads } from "@db";
import { and, eq, sql } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import { initSmtpClient } from "./imap-client";

type MoveJob = {
	threadId: string;
	mailboxId: string; // source
	op: "trash" | "archive" | "spam" | "move";
	toMailboxId?: string; // required when op === "move"
	moveImap: boolean;
	messageId?: string;
};

export const moveMail = async (
	data: MoveJob,
	imapInstances: Map<string, ImapFlow>,
) => {
	const {
		threadId,
		mailboxId: fromMailboxId,
		op,
		toMailboxId,
		moveImap,
	} = data;

	// Source mailbox
	const [srcMailbox] = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.id, fromMailboxId));
	if (!srcMailbox) return;

	// Destination mailbox
	let destMailboxRow: typeof mailboxes.$inferSelect | undefined;

	if (op === "move") {
		if (!toMailboxId || toMailboxId === fromMailboxId) return;
		[destMailboxRow] = await db
			.select()
			.from(mailboxes)
			.where(
				and(
					eq(mailboxes.id, toMailboxId),
					eq(mailboxes.identityId, srcMailbox.identityId),
				),
			);
	} else {
		[destMailboxRow] = await db
			.select()
			.from(mailboxes)
			.where(
				and(
					eq(mailboxes.identityId, srcMailbox.identityId),
					eq(mailboxes.kind, op as any),
				),
			);
	}

	if (!destMailboxRow) {
		console.warn(
			`[mail:move] No destination for op=${op} identity=${srcMailbox.identityId}`,
		);
		return;
	}

	const destPath: string =
		(destMailboxRow.metaData as any)?.imap?.path ?? destMailboxRow.name;

	// Messages in thread scoped to the source mailbox
	const threadMsgs = await db
		.select({ id: messages.id, meta: messages.metaData })
		.from(messages)
		.where(
			and(
				eq(messages.threadId, threadId),
				eq(messages.mailboxId, fromMailboxId),
			),
		);
	if (threadMsgs.length === 0) return;

	// IMAP move (if applicable)
	if (moveImap) {
		type Group = { path: string; uids: number[]; messageIds: string[] };
		const byPath = new Map<string, Group>();

		for (const m of threadMsgs) {
			const im = (m.meta as any)?.imap;
			const uid = im?.uid as number | undefined;
			const srcPath = im?.mailboxPath as string | undefined;
			if (!uid || !srcPath) continue;
			const g = byPath.get(srcPath) ?? {
				path: srcPath,
				uids: [],
				messageIds: [],
			};
			g.uids.push(Number(uid));
			g.messageIds.push(m.id);
			byPath.set(srcPath, g);
		}

		if (!byPath.size) {
			console.debug(
				"[mail:move] No IMAP-backed UIDs to move; DB-only move will proceed.",
			);
		} else {
			const client = await initSmtpClient(srcMailbox.identityId, imapInstances);
			if (client?.authenticated && client.usable) {
				try {
					for (const { path: srcPath, uids } of byPath.values()) {
						if (!uids.length) continue;
						const lock = await client.getMailboxLock(srcPath);
						try {
							await client.messageMove(uids, destPath, { uid: true });
						} finally {
							lock.release();
						}
					}
				} catch (err) {
					console.error("[mail:move] IMAP move failed:", err);
					// Let DB update happen; delta sync can reconcile.
				}
			}
		}
	}

	// DB update
	await db.transaction(async (tx) => {
		const set: Record<string, any> = {
			mailboxId: destMailboxRow.id,
			updatedAt: new Date(),
		};
		if (moveImap) {
			set.metaData = sql`
        jsonb_set(
          coalesce(${messages.metaData}, '{}'::jsonb),
          '{imap,mailboxPath}',
          to_jsonb(${destPath}::text),
          true
        )
      `;
		}

		await tx
			.update(messages)
			.set(set)
			.where(
				and(
					eq(messages.threadId, threadId),
					eq(messages.mailboxId, fromMailboxId),
				),
			);

		await tx
			.update(mailboxThreads)
			.set({
				mailboxId: destMailboxRow.id,
				mailboxSlug: op === "move" ? (destMailboxRow.slug ?? "custom") : op,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(mailboxThreads.threadId, threadId),
					eq(mailboxThreads.mailboxId, fromMailboxId),
				),
			);
	});
};
