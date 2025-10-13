import {
	db,
	identities,
	mailboxes,
	mailboxSync,
	messages,
	threads,
	mailboxThreads,
} from "@db";
import { and, desc, eq, sql } from "drizzle-orm";
import { parseAndStoreEmail } from "../message-payload-parser";
import { initSmtpClient } from "./imap-client";
import type { ImapFlow } from "imapflow";
import { syncMailbox } from "./imap-sync-mailbox";
import { upsertMailboxThreadItem } from "@common";
import { getRedis } from "../../lib/get-redis";

/**
 * Incremental sync for all mailboxes of an identity.
 * - Skips mailboxes that are backfilling / not idle
 * - Inserts new messages
 * - Detects cross-mailbox moves and updates:
 *     * messages.mailboxId + metaData.imap.mailboxPath for all msgs in the thread
 *     * threads.mailboxId
 *     * mailboxThreads (re-upsert from newest msg)
 *     * search index (refresh-thread)
 */
export const deltaFetch = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) => {
	const client = await initSmtpClient(identityId, imapInstances);
	if (!client?.authenticated || !client?.usable) return;

	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId));
	const ownerId = identity?.ownerId;
	if (!ownerId) return;

	const mailboxRows = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.identityId, identityId));

	for (const row of mailboxRows) {
		// only when fully idle
		const [syncRow] = await db
			.select()
			.from(mailboxSync)
			.where(
				and(
					eq(mailboxSync.identityId, identityId),
					eq(mailboxSync.mailboxId, row.id),
				),
			);

		if (!syncRow) continue;
		if (syncRow.phase !== "IDLE" || Number(syncRow.backfillCursorUid || 0) > 0)
			continue;

		await syncMailbox({
			client,
			identityId,
			mailboxId: row.id,
			path: String((row?.metaData as any)?.imap?.path ?? row.name),
			window: 500,
			onMessage: async (msg, path: string) => {
				// Helpful while stabilizing
				// console.dir(msg, { depth: 6 });

				const messageId = msg.envelope?.messageId?.trim() || null;
				const uid = msg.uid;
				const raw = (await msg.source?.toString()) || "";

				// If no Message-ID, still persist (rare but happens)
				if (!messageId) {
					console.warn(
						`[deltaFetch] Missing Message-ID — path=${path} uid=${uid}`,
					);
					return await parseAndStoreEmail(raw, {
						ownerId,
						mailboxId: row.id,
						rawStorageKey: `eml/${ownerId}/${row.id}/${uid}.eml`,
						emlKey: String(msg.id),
						metaData: { imap: { uid, mailboxPath: path } },
					});
				}

				// Check if we already have this message anywhere for this owner
				const [existing] = await db
					.select({
						id: messages.id,
						mailboxId: messages.mailboxId,
						threadId: messages.threadId,
					})
					.from(messages)
					.where(
						and(
							eq(messages.ownerId, ownerId),
							eq(messages.messageId, messageId),
						),
					);

				if (existing) {
					// Cross-mailbox move: update *all* messages in the thread + thread record
					if (existing.mailboxId !== row.id) {
						console.log(
							`[deltaFetch] Move detected for ${messageId}: ${existing.mailboxId} → ${row.id}`,
						);

						// Update every message in the thread to the new mailbox & IMAP path
						const all = await db
							.select()
							.from(messages)
							.where(eq(messages.threadId, existing.threadId));
						for (const m of all) {
							const updatedMeta = {
								...(m.metaData as any),
								imap: {
									...((m.metaData as any)?.imap || {}),
									mailboxPath: path,
								},
							};
							await db
								.update(messages)
								.set({ mailboxId: row.id, metaData: updatedMeta })
								.where(eq(messages.id, m.id))
								.catch((e) =>
									console.error("[deltaFetch] failed message move update", e),
								);
						}

						// Canonical thread mailbox follows the newest message’s mailbox
						await db
							.update(threads)
							.set({ mailboxId: row.id })
							.where(eq(threads.id, existing.threadId))
							.catch((e) =>
								console.error("[deltaFetch] failed thread mailbox update", e),
							);

						// Rebuild mailboxThreads for this thread
						await db
							.delete(mailboxThreads)
							.where(eq(mailboxThreads.threadId, existing.threadId));

						const [newest] = await db
							.select({ id: messages.id })
							.from(messages)
							.where(eq(messages.threadId, existing.threadId))
							.orderBy(
								desc(sql`coalesce(${messages.date}, ${messages.createdAt})`),
							)
							.limit(1);

						if (newest?.id) {
							await upsertMailboxThreadItem(newest.id).catch((e) =>
								console.error("[deltaFetch] upsertMailboxThreadItem failed", e),
							);
						}

						// Ask Typesense to refresh the whole thread grouping
						try {
							const { searchIngestQueue } = await getRedis();
							await searchIngestQueue.add(
								"refresh-thread",
								{ threadId: existing.threadId },
								{
									jobId: `refresh-${existing.threadId}`,
									attempts: 3,
									backoff: { type: "exponential", delay: 1500 },
									removeOnComplete: true,
									removeOnFail: false,
								},
							);
						} catch (e) {
							console.warn("[deltaFetch] enqueue refresh-thread failed", e);
						}

						return;
					}

					// Already present in the same mailbox — nothing to do
					return;
				}

				// New message → parse & store
				await parseAndStoreEmail(raw, {
					ownerId,
					mailboxId: row.id,
					rawStorageKey: `eml/${ownerId}/${row.id}/${uid}.eml`,
					emlKey: String(msg.id),
					metaData: { imap: { uid, mailboxPath: path } },
				});

				return undefined as any;
			},
		});
	}
};

// import {db, identities, mailboxes, mailboxSync, messages, threads, threadsList} from "@db";
// import {and, eq} from "drizzle-orm";
// import {parseAndStoreEmail} from "../message-payload-parser";
// import {initSmtpClient} from "./imap-client";
// import {ImapFlow} from "imapflow";
// import {syncMailbox} from "./imap-sync-mailbox";
//
// export const deltaFetch = async (identityId: string, imapInstances: Map<string, ImapFlow>) => {
//     const client = await initSmtpClient(identityId, imapInstances);
//     if (!client?.authenticated || !client?.usable) return;
//
//     const [identity] = await db
//         .select()
//         .from(identities)
//         .where(eq(identities.id, identityId));
//     const ownerId = identity?.ownerId;
//     if (!ownerId) return;
//
//     const mailboxRows = await db
//         .select()
//         .from(mailboxes)
//         .where(eq(mailboxes.identityId, identityId));
//
//     for (const row of mailboxRows) {
//         // Only sync when fully idle (not during backfill or uninitialized)
//         const [syncRow] = await db
//             .select()
//             .from(mailboxSync)
//             .where(
//                 and(
//                     eq(mailboxSync.identityId, identityId),
//                     eq(mailboxSync.mailboxId, row.id),
//                 ),
//             );
//         if (!syncRow) continue;
//         if (
//             syncRow.phase !== "IDLE" ||
//             Number(syncRow.backfillCursorUid || 0) > 0
//         )
//             continue;
//
//         await syncMailbox({
//             client,
//             identityId: identityId,
//             mailboxId: row.id,
//             path: String(row?.metaData?.imap.path),
//             window: 500,
//             onMessage: async (msg, path: string) => {
//
//                 console.dir(msg, { depth: 10 });
//
//                 const messageId = msg.envelope?.messageId?.trim() || null;
//                 const uid = msg.uid;
//                 const raw = (await msg.source?.toString()) || "";
//
//                 if (!messageId) {
//                     console.warn(`[deltaFetch] Message missing messageId — ${path} UID=${uid}`);
//                     return await parseAndStoreEmail(raw, {
//                         ownerId,
//                         mailboxId: row.id,
//                         rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
//                         emlKey: String(msg.id),
//                         metaData: {
//                             imap: {
//                                 uid: msg.uid,
//                                 mailboxPath: path
//                             }
//                         }
//                     });
//                 }
//
//                 const [existing] = await db
//                     .select({ id: messages.id, mailboxId: messages.mailboxId, threadId: messages.threadId })
//                     .from(messages)
//                     .where(
//                         and(
//                             eq(messages.ownerId, ownerId),
//                             // eq(messages.mailboxId, row.id),
//                             eq(messages.messageId, messageId)
//                         )
//                     )
//
//                 if(existing){
//                     if (existing.mailboxId !== row.id) {
//                         console.log(`[deltaFetch] Message moved: ${messageId} ${existing.mailboxId} → ${row.id}`);
//                         const allMessagesInThread = await db
//                             .select()
//                             .from(messages)
//                             .where(eq(messages.threadId, existing.threadId));
//
//                         // Move all messages in the thread to the new mailbox
//                         for (const message of allMessagesInThread) {
//                             const updatedMetaData = {
//                                 ...message.metaData,
//                                 imap: {
//                                     ...(message.metaData?.imap || {}),
//                                     mailboxPath: path,
//                                 },
//                             };
//
//                             await db.update(messages)
//                                 .set({
//                                     mailboxId: row.id,
//                                     metaData: updatedMetaData
//                                 })
//                                 .where(eq(messages.id, message.id)).catch((e) => {
//                                     console.error("Failed to update message mailboxId", e);
//                                 })
//                         }
//
//                         await db
//                             .update(threads)
//                             .set({ mailboxId: row.id })
//                             .where(eq(threads.id, existing.threadId)).catch((e) => {
//                                 console.error("Failed to update threads mailboxId", e);
//                             });
//
//                         await db.update(threadsList)
//                             .set({
//                                 mailboxId: row.id,
//                                 mailboxSlug: row.slug,
//                                 // lastActivityAt: new Date(),         // optional: keep ordering fresh
//                                 // updatedAt: new Date(),
//                             })
//                             .where(eq(threadsList.id, existing.threadId));
//
//                         return
//                     }
//                 }
//
//                 // New message
//                 await parseAndStoreEmail(raw, {
//                     ownerId,
//                     mailboxId: row.id,
//                     rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
//                     emlKey: String(msg.id),
//                     metaData: {
//                         imap: {
//                             uid: msg.uid,
//                             mailboxPath: path
//                         }
//                     }
//                 });
//
//                 return undefined as any;
//
//                 // const raw = (await msg?.source?.toString()) || "";
//                 // await parseAndStoreEmail(raw, {
//                 // 	ownerId,
//                 // 	mailboxId: row.id,
//                 // 	rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
//                 // 	emlKey: String(msg.id),
//                 //     metaData: {
//                 //         imap: {
//                 //             uid: msg.uid,
//                 //             mailboxPath: path
//                 //         }
//                 //     }
//                 // });
//             },
//         });
//     }
// };
