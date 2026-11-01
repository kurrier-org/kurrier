import { FetchMessageObject, ImapFlow } from "imapflow";
import { db, mailboxSync, messages } from "@db";
import { and, eq, sql } from "drizzle-orm";
import { MailboxStore } from "@providers";
import { getRedis } from "../../lib/get-redis";

export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

const FLAG_SYNC_LIMIT = 500;

async function refreshThreads(threadIds: Set<string>) {
	if (!threadIds.size) return;

	const { searchIngestQueue } = await getRedis();

	await Promise.all(
		[...threadIds].map((threadId) =>
			searchIngestQueue.add(
				"refresh-thread",
				{ threadId },
				{
					removeOnComplete: true,
					removeOnFail: false,
					attempts: 3,
					backoff: {
						type: "exponential",
						delay: 1500,
					},
				},
			),
		),
	);
}

async function syncMailboxFlags(
	client: ImapFlow,
	mailboxId: string,
	limit?: number,
) {
	const mailbox = client.mailbox;

	if (!mailbox || !mailbox.exists) return;

	const total = mailbox.exists;
	const start = limit ? Math.max(1, total - limit + 1) : 1;

	const localMessages = await db
		.select({
			id: messages.id,
			threadId: messages.threadId,
			uid: sql<string>`${messages.metaData} -> 'imap' ->> 'uid'`,
			seen: messages.seen,
			flagged: messages.flagged,
			answered: messages.answered,
		})
		.from(messages)
		.where(eq(messages.mailboxId, mailboxId));

	const localByUid = new Map(
		localMessages
			.filter((message) => {
				const uid = Number(message.uid);
				return Number.isSafeInteger(uid) && uid > 0;
			})
			.map((message) => [Number(message.uid), message]),
	);

	const affectedThreads = new Set<string>();

	for await (const msg of client.fetch(`${start}:*`, {
		uid: true,
		flags: true,
	})) {
		const local = localByUid.get(msg.uid);

		if (!local || !msg.flags) continue;

		const seen = msg.flags.has("\\Seen");
		const flagged = msg.flags.has("\\Flagged");
		const answered = msg.flags.has("\\Answered");

		if (
			local.seen === seen &&
			local.flagged === flagged &&
			local.answered === answered
		) {
			continue;
		}

		await MailboxStore.setFlags({
			messageId: local.id,
			mailboxId,
			flags: {
				seen,
				flagged,
				answered,
			},
		});

		affectedThreads.add(local.threadId);
	}

	await refreshThreads(affectedThreads);
}

async function reconcileMailboxUids(
	client: ImapFlow,
	mailboxId: string,
	onMissingMessage: (msg: FetchMessageObject) => Promise<void>,
) {
	const uids = await client.search(
		{ all: true },
		{ uid: true },
	);

	if (uids === false) {
		throw new Error(
			"IMAP UID search failed; skipping reconciliation",
		);
	}

	const serverUids = new Set<number>(uids);

	const localMessages = await db
		.select({
			id: messages.id,
			uid: sql<string>`${messages.metaData} -> 'imap' ->> 'uid'`,
		})
		.from(messages)
		.where(eq(messages.mailboxId, mailboxId));

	const localUids = new Set(
		localMessages
			.map((message) => Number(message.uid))
			.filter(
				(uid) =>
					Number.isSafeInteger(uid) &&
					uid > 0,
			),
	);

	const missingUids = [...serverUids]
		.filter((uid) => !localUids.has(uid))
		.sort((a, b) => b - a)
		.slice(0, 50);

	if (missingUids.length) {
		console.log("[imap:reconcile] Recovering missing UIDs", {
			mailboxId,
			uids: missingUids,
		});

		for await (const msg of client.fetch(
			{ uid: missingUids.join(",") },
			{
				uid: true,
				envelope: true,
				flags: true,
				internalDate: true,
				size: true,
				source: true,
			},
		)) {
			await onMissingMessage(msg);
		}
	}

	const affectedThreads = new Set<string>();

	for (const message of localMessages) {
		const uid = Number(message.uid);

		if (!Number.isSafeInteger(uid) || uid <= 0) {
			continue;
		}

		if (serverUids.has(uid)) continue;

		const threadId = await MailboxStore.deleteMessage(
			message.id,
		);

		console.log(
			`[imap:reconcile] Deleted missing UID ${uid} from mailbox ${mailboxId}, thread ${threadId}`,
		);

		if (threadId) {
			affectedThreads.add(threadId);
		}
	}

	await refreshThreads(affectedThreads);
}

export async function syncMailbox(opts: {
	client: ImapFlow;
	identityId: string;
	workspaceId: string;
	mailboxId: string;
	path: string;
	window?: number;
	politeWaitMs?: number;
	reconcile?: boolean;
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
		reconcile = false,
	} = opts;

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

		const box = await client.mailboxOpen(path, {
			readOnly: true,
		});

		const serverUidValidity = box.uidValidity;
		const storedUidValidity = sync.uidValidity;

		const uidValidityChanged =
			!!serverUidValidity &&
			!!storedUidValidity &&
			serverUidValidity !== storedUidValidity;

		const canReconcile =
			!uidValidityChanged &&
			sync.phase === "IDLE" &&
			Number(sync.backfillCursorUid ?? 0) === 0 &&
			!!serverUidValidity &&
			!!storedUidValidity &&
			serverUidValidity === storedUidValidity;

		if (uidValidityChanged) {
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
					backfillCursorUid: Math.max(
						0,
						(box.uidNext ?? 1) - 1,
					),
					highestModseq: null,
					phase: "BACKFILL",
					error: null,
					updatedAt: new Date(),
				})
				.where(eq(mailboxSync.id, sync.id));
		}

		const currentTop = Math.max(
			0,
			(box.uidNext ?? 1) - 1,
		);

		const serverModseq = box.highestModseq;
		const storedModseq = uidValidityChanged
			? null
			: sync.highestModseq;

		const modseqChanged =
			serverModseq == null ||
			storedModseq == null ||
			BigInt(serverModseq) !== BigInt(storedModseq);

		const syncFlagsAndReconcile = async () => {
			if (!canReconcile) return;

			if (reconcile || modseqChanged) {
				console.info("[imap:flags] syncing", {

					path,
					reconcile,
					serverModseq: serverModseq?.toString(),
					storedModseq,
				});

				await syncMailboxFlags(
					client,
					mailboxId,
					serverModseq == null
						? reconcile
							? undefined
							: FLAG_SYNC_LIMIT
						: undefined,
				);
			} else {

				console.info("[imap:flags] skipped (MODSEQ unchanged)", {
					path,
					modseq: serverModseq?.toString(),
				});

			}

			if (reconcile) {
				await reconcileMailboxUids(
					client,
					mailboxId,
					(msg) =>
						onMessage(
							msg,
							path,
							identityId,
							workspaceId,
							mailboxId,
						),
				);
			}

			if (serverModseq != null) {
				await db
					.update(mailboxSync)
					.set({
						highestModseq: String(serverModseq),
						updatedAt: new Date(),
					})
					.where(eq(mailboxSync.id, sync.id));
			}
		};

		if (currentTop <= lastSeen) {
			await syncFlagsAndReconcile();
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
				syncedAt: new Date(),
				error: null,
				updatedAt: new Date(),
			})
			.where(eq(mailboxSync.id, sync.id));

		await syncFlagsAndReconcile();

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
