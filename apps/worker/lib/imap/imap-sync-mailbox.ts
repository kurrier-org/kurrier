import { FetchMessageObject, ImapFlow } from "imapflow";
import { db, mailboxSync } from "@db";
import { and, eq } from "drizzle-orm";

export const sleep = (ms: number) =>
	new Promise((r) => setTimeout(r, ms));

export async function syncMailbox(opts: {
	client: ImapFlow;
	identityId: string;
	workspaceId: string;
	mailboxId: string;
	path: string;
	window?: number;
	politeWaitMs?: number;
	onMessage: (
		msg: FetchMessageObject,
		path: string,
		identityId: string,
		workspaceId: string,
		mailboxId: string,
	) => Promise<void>;
}) {
	const {
		client,
		identityId,
		workspaceId,
		mailboxId,
		path,
		window = 500,
		politeWaitMs = 20,
		onMessage,
	} = opts;

	console.log("[syncMailbox] start", {
		identityId,
		mailboxId,
		path,
	});

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

		if (!sync) {
			throw new Error(
				`mailbox_sync row missing for mailboxId=${mailboxId}`,
			);
		}

		let lastSeen = Number(sync.lastSeenUid || 0);

		console.log("[syncMailbox] local cursor", {
			identityId,
			mailboxId,
			path,
			lastSeenUid: lastSeen,
			phase: sync.phase,
			backfillCursorUid: sync.backfillCursorUid,
			uidValidity: sync.uidValidity,
		});

		const box = await client.mailboxOpen(path, {
			readOnly: true,
		});

		/*
		 * UIDVALIDITY is part of the IMAP UID namespace.
		 *
		 * If it changes, every UID we previously stored for this mailbox
		 * must be considered stale. Reset the live cursor and replay the
		 * mailbox using the new UID namespace.
		 *
		 * parseAndStoreEmail() is now replay-safe, so existing messages
		 * will have their IMAP metadata/flags refreshed rather than being
		 * duplicated.
		 */
		const serverUidValidity = box.uidValidity;
		const storedUidValidity = sync.uidValidity;

		if (
			serverUidValidity &&
			storedUidValidity &&
			serverUidValidity !== storedUidValidity
		) {
			console.warn("[syncMailbox] UIDVALIDITY changed", {
				identityId,
				mailboxId,
				path,
				storedUidValidity,
				serverUidValidity,
			});

			lastSeen = 0;

			await db
				.update(mailboxSync)
				.set({
					uidValidity: serverUidValidity,
					lastSeenUid: 0,
					error: null,
					updatedAt: new Date(),
				})
				.where(eq(mailboxSync.id, sync.id));
		}

		const currentTop = Math.max(
			0,
			(box.uidNext ?? 1) - 1,
		);

		console.log("[syncMailbox] server state", {
			identityId,
			mailboxId,
			path,
			uidValidity: box.uidValidity,
			uidNext: box.uidNext,
			currentTop,
			lastSeen,
			diff: currentTop - lastSeen,
		});

		if (currentTop <= lastSeen) {
			console.log("[syncMailbox] nothing new", {
				identityId,
				mailboxId,
				path,
				currentTop,
				lastSeen,
			});

			return;
		}

		let start = lastSeen + 1;

		while (start <= currentTop) {
			const end = Math.min(
				currentTop,
				start + window - 1,
			);

			const range = `${start}:${end}`;

			console.log("[syncMailbox] fetching", {
				identityId,
				mailboxId,
				path,
				range,
			});

			let maxUid = lastSeen;
			let fetched = 0;

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
				fetched++;

				console.log("[syncMailbox] fetched message", {
					identityId,
					mailboxId,
					path,
					uid: msg.uid,
					messageId:
						msg.envelope?.messageId ?? null,
				});

				await onMessage(
					msg,
					path,
					identityId,
					workspaceId,
					mailboxId,
				);

				if (msg.uid && msg.uid > maxUid) {
					maxUid = msg.uid;
				}
			}

			console.log("[syncMailbox] fetch complete", {
				identityId,
				mailboxId,
				path,
				range,
				fetched,
				maxUid,
				lastSeen,
			});

			/*
			 * Advance to the end of the requested UID range even when the
			 * server returned no messages. UID ranges can contain holes
			 * because messages may have been expunged.
			 */
			lastSeen = end;

			await db
				.update(mailboxSync)
				.set({
					lastSeenUid: lastSeen,
					error: null,
					updatedAt: new Date(),
				})
				.where(eq(mailboxSync.id, sync.id));

			start = end + 1;

			if (politeWaitMs) {
				await sleep(politeWaitMs);
			}
		}

		await db
			.update(mailboxSync)
			.set({
				phase: "IDLE",
				syncedAt: new Date(),
				error: null,
				updatedAt: new Date(),
			})
			.where(eq(mailboxSync.id, sync.id));

		console.log("[syncMailbox] complete", {
			identityId,
			mailboxId,
			path,
			lastSeenUid: lastSeen,
		});
	} catch (err: any) {
		console.error("[syncMailbox] failed", {
			identityId,
			mailboxId,
			path,
			error: err?.message ?? err,
		});

		await db
			.update(mailboxSync)
			.set({
				error: err?.message ?? String(err),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(mailboxSync.identityId, identityId),
					eq(mailboxSync.mailboxId, mailboxId),
				),
			)
			.catch(() => {});

		throw err;
	} finally {
		lock.release();
	}
}
