import { FetchMessageObject, ImapFlow } from "imapflow";
import { db, mailboxSync } from "@db";
import { and, eq } from "drizzle-orm";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function syncMailbox(opts: {
	client: ImapFlow;
	identityId: string;
	mailboxId: string;
	path: string;
	window?: number; // default 500
	politeWaitMs?: number; // default 20ms
	onMessage: (
		msg: FetchMessageObject,
		path: string,
		identityId: string,
		mailboxId: string,
	) => Promise<void>;
}) {
	const {
		client,
		identityId,
		mailboxId,
		path,
		window = 500,
		politeWaitMs = 20,
		onMessage,
	} = opts;

	// await client.mailboxOpen(path, { readOnly: true });
	const lock = await client.getMailboxLock(path);
	try {
		const [sync] = await db
			.select()
			.from(mailboxSync)
			.where(
				and(
					eq(mailboxSync.identityId, identityId),
					eq(mailboxSync.mailboxId, mailboxId),
				),
			);
		if (!sync)
			throw new Error(`mailbox_sync row missing for mailboxId=${mailboxId}`);

		let lastSeen = Number(sync.lastSeenUid || 0);

		// What's the current head?
		const box = await client.mailboxOpen(path, { readOnly: true });
		const currentTop = Math.max(0, (box.uidNext ?? 1) - 1);
		if (currentTop <= lastSeen) return; // nothing new

		let start = lastSeen + 1;
		while (start <= currentTop) {
			const end = Math.min(currentTop, start + window - 1);
			const range = `${start}:${end}`;

			let maxUid = lastSeen;

			for await (const msg of client.fetch(
				{ uid: range },
				{
					uid: true,
					envelope: true,
					flags: true,
					internalDate: true,
					size: true,
					source: true,
				},
			)) {
				await onMessage(msg, path, identityId, mailboxId);
				if (msg.uid && msg.uid > maxUid) maxUid = msg.uid;
			}

			if (maxUid > lastSeen) {
				lastSeen = maxUid;
				await db
					.update(mailboxSync)
					.set({ lastSeenUid: lastSeen, updatedAt: new Date() })
					.where(eq(mailboxSync.id, sync.id));
			}

			start = end + 1;
			if (politeWaitMs) await sleep(politeWaitMs);
		}

		await db
			.update(mailboxSync)
			.set({ phase: "IDLE", syncedAt: new Date(), updatedAt: new Date() })
			.where(eq(mailboxSync.id, sync.id));
	} finally {
		lock.release();
	}
}
