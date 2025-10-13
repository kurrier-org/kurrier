import { db, messages, mailboxThreads, mailboxes } from "@db";
import { and, desc, eq, sql } from "drizzle-orm";
import { initSmtpClient } from "./imap-client";
import { ImapFlow } from "imapflow";

export async function mailSetFlags(
	data: { threadId: string; mailboxId: string; op: string },
	imapInstances: Map<string, ImapFlow>,
) {
	const { threadId, mailboxId, op } = data;

	// 1️⃣ Load mailbox info (we need identityId for IMAP connection)
	const [mailbox] = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.id, mailboxId));
	if (!mailbox) return;

	const client = await initSmtpClient(mailbox.identityId, imapInstances);
	if (!client?.authenticated || !client?.usable) return;

	// 2️⃣ Fetch all messages in this mailbox + thread
	const threadMessages = await db
		.select()
		.from(messages)
		.where(
			and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)),
		)
		.orderBy(desc(sql`coalesce(${messages.date}, ${messages.createdAt})`));

	const newest = threadMessages[0];
	if (!newest) return;

	// 3️⃣ Map op → IMAP flag and add/remove behavior
	const opToAction = (
		op: string,
	): {
		fn: "add" | "del";
		flag: "\\Seen" | "\\Flagged" | "\\Answered";
	} | null => {
		switch (op) {
			case "read":
				return { fn: "add", flag: "\\Seen" };
			case "unread":
				return { fn: "del", flag: "\\Seen" };
			case "flag":
				return { fn: "add", flag: "\\Flagged" };
			case "unflag":
				return { fn: "del", flag: "\\Flagged" };
			case "answered":
				return { fn: "add", flag: "\\Answered" };
			case "unanswered":
				return { fn: "del", flag: "\\Answered" };
			default:
				return null;
		}
	};

	const action = opToAction(op);
	if (!action) return;

	// 4️⃣ Group messages by mailboxPath (IMAP folder)
	const byMailbox = new Map<string, Array<{ id: string; uid: number }>>();
	for (const m of threadMessages) {
		const imap = (m.metaData as any)?.imap;
		const uid = Number(imap?.uid);
		const mailboxPath = imap?.mailboxPath as string | undefined;
		if (!uid || !mailboxPath) continue;

		if (!byMailbox.has(mailboxPath)) byMailbox.set(mailboxPath, []);
		byMailbox.get(mailboxPath)!.push({ id: m.id, uid });
	}

	// 5️⃣ Perform IMAP updates
	for (const [mailboxPath, list] of byMailbox.entries()) {
		const uids = list.map((x) => x.uid).sort((a, b) => a - b);
		if (!uids.length) continue;

		try {
			const lock = await client.getMailboxLock(mailboxPath);
			try {
				if (action.fn === "add") {
					await client.messageFlagsAdd(uids, [action.flag], { uid: true });
				} else {
					await client.messageFlagsRemove(uids, [action.flag], { uid: true });
				}
			} finally {
				lock.release();
			}
		} catch (err) {
			console.error(`[mail:set-flags] mailbox=${mailboxPath} error`, err);
		}
	}

	// 6️⃣ Reflect locally in DB (messages + mailboxThreads)
	await db.transaction(async (tx) => {
		const update: Record<string, any> = { updatedAt: new Date() };
		if (op === "read") update.seen = true;
		if (op === "unread") update.seen = false;
		if (op === "flag") update.flagged = true;
		if (op === "unflag") update.flagged = false;

		await tx
			.update(messages)
			.set(update)
			.where(
				and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)),
			);

		// Compute unread count and starred status
		const [agg] = await tx
			.select({
				unreadCount: sql<number>`count(*) filter (where ${messages.seen} = false)`,
				anyFlagged: sql<boolean>`bool_or(${messages.flagged})`,
			})
			.from(messages)
			.where(
				and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)),
			);

		await tx
			.update(mailboxThreads)
			.set({
				unreadCount: agg.unreadCount ?? 0,
				starred: agg.anyFlagged ?? false,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(mailboxThreads.threadId, threadId),
					eq(mailboxThreads.mailboxId, mailboxId),
				),
			);
	});
}
