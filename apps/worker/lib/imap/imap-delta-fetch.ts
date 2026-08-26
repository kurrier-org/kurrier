import {
	db,
	identities,
	mailboxes,
	mailboxSync,
	messages,
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
 * Prevent more than one delta sync from running for the same
 * identity inside this worker process.
 *
 * This protects against:
 * - multiple EXISTS events arriving quickly
 * - manual delta overlapping an EXISTS-triggered delta
 * - duplicate BullMQ work inside the same process
 */
const runningDeltaFetches = new Map<string, Promise<void>>();

async function runDeltaFetch(
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) {
	const client = await initSmtpClient(identityId, imapInstances);

	if (!client?.authenticated || !client?.usable) {
		console.warn(
			`[deltaFetch:${identityId}] IMAP client not usable`,
		);
		return;
	}

	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId))
		.limit(1);

	const ownerId = identity?.ownerId;
	const workspaceId = identity?.workspaceId;

	if (!ownerId || !workspaceId) {
		console.warn(
			`[deltaFetch:${identityId}] identity missing owner/workspace`,
		);
		return;
	}

	const mailboxRows = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.identityId, identityId));

	for (const row of mailboxRows) {
		const [syncRow] = await db
			.select()
			.from(mailboxSync)
			.where(
				and(
					eq(mailboxSync.identityId, identityId),
					eq(mailboxSync.mailboxId, row.id),
				),
			)
			.limit(1);

		if (!syncRow) {
			continue;
		}

		const path = String(
			(row.metaData as any)?.imap?.path ?? row.name,
		);

		if (!path) {
			continue;
		}

		await syncMailbox({
			client,
			identityId,
			workspaceId,
			mailboxId: row.id,
			path,
			window: 500,

			onMessage: async (msg, path: string) => {
				const messageId =
					msg.envelope?.messageId?.trim() || null;

				const uid = msg.uid;

				const raw =
					(await msg.source?.toString()) || "";

				const flags =
					msg.flags ?? new Set<string>();

				const isSeen =
					flags.has("\\Seen");

				const isFlagged =
					flags.has("\\Flagged");

				const isAnswered =
					flags.has("\\Answered");

				if (!messageId) {
					console.warn(
						`[deltaFetch] Missing Message-ID — path=${path} uid=${uid}`,
					);

					await parseAndStoreEmail(
						raw,
						{
							ownerId,
							workspaceId,
							mailboxId: row.id,

							rawStorageKey:
								`eml/${ownerId}/${row.id}/${uid}.eml`,

							emlKey:
								String(msg.id),

							metaData: {
								imap: {
									uid,
									mailboxPath: path,
									flags: [...flags],
								},
							},

							seen: isSeen,
							flagged: isFlagged,
							answered: isAnswered,
						},
					);

					return;
				}

				const [existing] = await db
					.select({
						id: messages.id,
						mailboxId: messages.mailboxId,
						threadId: messages.threadId,
					})
					.from(messages)
					.where(
						and(
							eq(
								messages.ownerId,
								ownerId,
							),
							eq(
								messages.messageId,
								messageId,
							),
						),
					)
					.limit(1);

				if (existing) {
					if (
						existing.mailboxId !== row.id
					) {
						console.log(
							`[deltaFetch] Move detected for ${messageId}: ${existing.mailboxId} → ${row.id}`,
						);

						const all = await db
							.select({
								id: messages.id,
								mailboxId:
								messages.mailboxId,
								metaData:
								messages.metaData,
								messageId:
								messages.messageId,
							})
							.from(messages)
							.where(
								and(
									eq(
										messages.threadId,
										existing.threadId,
									),
									eq(
										messages.mailboxId,
										existing.mailboxId,
									),
								),
							);

						for (const m of all) {
							if (
								m.mailboxId === row.id
							) {
								continue;
							}

							const [dup] =
								await db
									.select({
										id:
										messages.id,
									})
									.from(messages)
									.where(
										and(
											eq(
												messages.ownerId,
												ownerId,
											),
											eq(
												messages.messageId,
												m.messageId,
											),
											eq(
												messages.mailboxId,
												row.id,
											),
										),
									)
									.limit(1);

							if (dup?.id) {
								await db
									.delete(messages)
									.where(
										eq(
											messages.id,
											m.id,
										),
									);

								continue;
							}

							const updatedMeta = {
								...(m.metaData as any),

								imap: {
									...(
										(m.metaData as any)
											?.imap || {}
									),

									mailboxPath:
									path,
								},
							};

							await db
								.update(messages)
								.set({
									mailboxId:
									row.id,

									metaData:
									updatedMeta,
								})
								.where(
									eq(
										messages.id,
										m.id,
									),
								)
								.catch((e) =>
									console.error(
										"[deltaFetch] failed message move update",
										e,
									),
								);
						}

						await db
							.delete(mailboxThreads)
							.where(
								eq(
									mailboxThreads.threadId,
									existing.threadId,
								),
							);

						const [newest] =
							await db
								.select({
									id:
									messages.id,
								})
								.from(messages)
								.where(
									eq(
										messages.threadId,
										existing.threadId,
									),
								)
								.orderBy(
									desc(
										sql`
											coalesce(
												${messages.date},
												${messages.createdAt}
											)
										`,
									),
								)
								.limit(1);

						if (newest?.id) {
							await upsertMailboxThreadItem(
								newest.id,
							).catch((e) =>
								console.error(
									"[deltaFetch] upsertMailboxThreadItem failed",
									e,
								),
							);
						}

						try {
							const {
								searchIngestQueue,
							} = await getRedis();

							await searchIngestQueue.add(
								"refresh-thread",
								{
									threadId:
									existing.threadId,
								},
								{
									jobId:
										`refresh-${existing.threadId}`,

									attempts: 3,

									backoff: {
										type:
											"exponential",
										delay: 1500,
									},

									removeOnComplete:
										true,

									removeOnFail:
										false,
								},
							);
						} catch (e) {
							console.warn(
								"[deltaFetch] enqueue refresh-thread failed",
								e,
							);
						}

						return;
					}

					return;
				}

				await parseAndStoreEmail(
					raw,
					{
						ownerId,
						workspaceId,
						mailboxId: row.id,

						rawStorageKey:
							`eml/${ownerId}/${row.id}/${uid}.eml`,

						emlKey:
							String(msg.id),

						metaData: {
							imap: {
								uid,
								mailboxPath: path,
								flags: [...flags],
							},
						},

						seen: isSeen,
						flagged: isFlagged,
						answered: isAnswered,
					},
				);
			},
		});
	}
}

/**
 * Public delta entry point.
 *
 * If a delta is already running for this identity, reuse the same
 * promise instead of starting another sync against the same cursor.
 */
export const deltaFetch = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) => {
	const existing =
		runningDeltaFetches.get(identityId);

	if (existing) {
		console.log(
			`[deltaFetch:${identityId}] already running; joining existing sync`,
		);

		return existing;
	}

	const running = runDeltaFetch(
		identityId,
		imapInstances,
	).finally(() => {
		if (
			runningDeltaFetches.get(identityId) ===
			running
		) {
			runningDeltaFetches.delete(identityId);
		}
	});

	runningDeltaFetches.set(
		identityId,
		running,
	);

	return running;
};
