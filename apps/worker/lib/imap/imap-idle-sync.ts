import { db, identities, mailboxes, mailboxThreads, messages } from "@db";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { initSmtpClient } from "./imap-client";
import type { ImapFlow } from "imapflow";
import type { FlagsEvent } from "imapflow";
import { deltaFetch } from "../../lib/imap/imap-delta-fetch";

async function handleFlagsUpdate(
	identityId: string,
	uid: number,
	mailboxPath: string,
	isFlagged: boolean,
	isSeen: boolean,
	isAnswered: boolean,
) {
	console.log(
		`[realtime:${identityId}] handleFlagsUpdate uid=${uid} mailboxPath=${mailboxPath} flagged=${isFlagged} seen=${isSeen}`,
	);

	await db.transaction(async (tx) => {
		const [mailbox] = await tx
			.select()
			.from(mailboxes)
			.where(
				and(
					eq(mailboxes.identityId, identityId),
					sql`${mailboxes.metaData} -> 'imap' ->> 'path' = ${mailboxPath}`,
				),
			);

		if (!mailbox) {
			console.warn(
				`[realtime:${identityId}] could not find mailbox for path=${mailboxPath}`,
			);
			return;
		}

		const [message] = await tx
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.mailboxId, mailbox.id),
					sql`(${messages.metaData} -> 'imap' ->> 'uid')::bigint = ${uid}`,
				),
			);

		if (!message) {
			console.warn(
				`[realtime:${identityId}] could not find message for uid=${uid} in mailboxId=${mailbox.id}`,
			);
			return;
		}

		if (message.flagged === isFlagged && message.seen === isSeen) {
			console.log(
				`[realtime:${identityId}] message ${message.id} already flagged=${isFlagged} seen=${isSeen}, skipping`,
			);
			return;
		}

		const now = new Date();

		await tx
			.update(messages)
			.set({
				flagged: isFlagged,
				seen: isSeen,
				answered: isAnswered,
				updatedAt: now,
			})
			.where(eq(messages.id, message.id));

		const [agg] = await tx
			.select({
				unreadCount: sql<number>`count(*) filter (where ${messages.seen} = false)`,
				anyFlagged: sql<boolean>`bool_or(${messages.flagged})`,
			})
			.from(messages)
			.where(
				and(
					eq(messages.threadId, message.threadId),
					eq(messages.mailboxId, mailbox.id),
				),
			);

		await tx
			.update(mailboxThreads)
			.set({
				unreadCount: agg?.unreadCount ?? 0,
				starred: agg?.anyFlagged ?? false,
				updatedAt: now,
			})
			.where(
				and(
					eq(mailboxThreads.threadId, message.threadId),
					eq(mailboxThreads.mailboxId, mailbox.id),
				),
			);

		console.log(
			`[realtime:${identityId}] updated mailboxThread for thread=${message.threadId} mailbox=${mailbox.id} unread=${agg?.unreadCount ?? 0} starred=${agg?.anyFlagged ?? false}`,
		);
	});
}

async function handleExpunge(
	identityId: string,
	mailboxPath: string,
	uid: number,
) {
	console.log(
		`[realtime:${identityId}] handleExpunge mailboxPath=${mailboxPath} uid=${uid}`,
	);

	await db.transaction(async (tx) => {
		const [mailbox] = await tx
			.select()
			.from(mailboxes)
			.where(
				and(
					eq(mailboxes.identityId, identityId),
					sql`${mailboxes.metaData} -> 'imap' ->> 'path' = ${mailboxPath}`,
				),
			);

		if (!mailbox) {
			console.warn(
				`[realtime:${identityId}] expunge: no mailbox for path=${mailboxPath}`,
			);
			return;
		}

		const [message] = await tx
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.mailboxId, mailbox.id),
					sql`(${messages.metaData} -> 'imap' ->> 'uid')::bigint = ${uid}`,
				),
			);

		if (!message) {
			console.warn(
				`[realtime:${identityId}] expunge: no message for uid=${uid} in mailbox=${mailbox.id}`,
			);
			return;
		}

		await tx.delete(messages).where(eq(messages.id, message.id));

		const [agg] = await tx
			.select({
				unreadCount: sql<number>`count(*) filter (where ${messages.seen} = false)`,
				anyFlagged: sql<boolean>`bool_or(${messages.flagged})`,
				messageCount: sql<number>`count(*)`,
			})
			.from(messages)
			.where(
				and(
					eq(messages.threadId, message.threadId),
					eq(messages.mailboxId, mailbox.id),
				),
			);

		const remainingCount = agg?.messageCount ?? 0;

		if (remainingCount === 0) {
			await tx
				.delete(mailboxThreads)
				.where(
					and(
						eq(mailboxThreads.threadId, message.threadId),
						eq(mailboxThreads.mailboxId, mailbox.id),
					),
				);
		} else {
			await tx
				.update(mailboxThreads)
				.set({
					unreadCount: agg?.unreadCount ?? 0,
					starred: agg?.anyFlagged ?? false,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(mailboxThreads.threadId, message.threadId),
						eq(mailboxThreads.mailboxId, mailbox.id),
					),
				);
		}

		console.log(
			`[realtime:${identityId}] expunge updated mailboxThreads for thread=${message.threadId} mailbox=${mailbox.id} remaining=${remainingCount}`,
		);
	});
}

function attachRealtimeEventHandlers(
	identityId: string,
	client: ImapFlow,
	imapInstances: Map<string, ImapFlow>,
) {
	client.on("exists", async (mailbox) => {
		await deltaFetch(identityId, imapInstances);
	});

	client.on("flags", async (ev: FlagsEvent) => {
		let uid = (ev as any).uid as number | undefined;
		if (!uid) {
			const msg = await client.fetchOne(ev.seq, { uid: true });
			if (msg) {
				uid = msg.uid;
			}
		}
		if (!uid) {
			console.warn(
				`[realtime:${identityId}] could not resolve UID for seq=${ev.seq}`,
			);
			return;
		}
		const isFlagged = ev.flags.has("\\Flagged");
		const isSeen = ev.flags.has("\\Seen");
		const isAnswered = ev.flags.has("\\Answered");
		await handleFlagsUpdate(
			identityId,
			uid,
			ev.path,
			isFlagged,
			isSeen,
			isAnswered,
		);
	});

	client.on("expunge", async (ev) => {
		console.log(`[realtime:${identityId}] EXPUNGE event`, ev);
		const uid = (ev as any).uid as number | undefined;
		if (!uid) {
			console.warn(
				`[realtime:${identityId}] expunge: missing uid for seq=${ev.seq}`,
			);
			return;
		}

		await handleExpunge(identityId, ev.path, uid);
	});
}

async function idleForever(identityId: string, client: ImapFlow) {
	console.log(`[realtime:${identityId}] entering idle loop...`);
	while (client.authenticated && client.usable) {
		try {
			await client.idle();
		} catch (err) {
			console.error(`[realtime:${identityId}] idle error`, err);
		}
	}
	console.warn(`[realtime:${identityId}] idle loop ended (client closed)`);
}

async function startRealtimeSyncForIdentity(
	identityId: string,
	client: ImapFlow,
	imapInstances: Map<string, ImapFlow>,
) {
	try {
		await client.getMailboxLock("INBOX");
		attachRealtimeEventHandlers(identityId, client, imapInstances);
		idleForever(identityId, client);
	} catch (err) {
		console.error(
			`[realtime:${identityId}] failed to start realtime sync`,
			err,
		);
	}
}

export async function startRealtimeForIdentity(
	identityId: string,
	idleImapInstances: Map<string, ImapFlow>,
	imapInstances: Map<string, ImapFlow>,
) {
	const client = await initSmtpClient(identityId, idleImapInstances);
	if (!client?.authenticated || !client?.usable) {
		console.log(`[startRealtimeForIdentity] identity=${identityId} not usable`);
		return;
	}

	if ((client as any).__kurrierRealtimeStarted) {
		console.log(
			`[startRealtimeForIdentity] identity=${identityId} realtime already active`,
		);
		return;
	}

	(client as any).__kurrierRealtimeStarted = true;
	await startRealtimeSyncForIdentity(identityId, client, imapInstances);
}

export async function stopRealtimeForIdentity(
	identityId: string,
	idleImapInstances: Map<string, ImapFlow>,
	imapInstances: Map<string, ImapFlow>,
) {
	const idleClient = idleImapInstances.get(identityId);
	const cmdClient = imapInstances.get(identityId);

	if (idleClient) {
		try {
			await idleClient.logout();
		} catch {}
		idleImapInstances.delete(identityId);
	}

	if (cmdClient) {
		try {
			await cmdClient.logout();
		} catch {}
		imapInstances.delete(identityId);
	}

	console.log(
		`[kurrier] Stopped realtime + command IMAP clients for identity ${identityId}`,
	);
}

export const imapIdleSync = async (
	idleImapInstances: Map<string, ImapFlow>,
	imapInstances: Map<string, ImapFlow>,
) => {
	const identityRows = await db
		.select()
		.from(identities)
		.where(isNotNull(identities.smtpAccountId));

	for (const identity of identityRows) {
		await startRealtimeForIdentity(
			identity.id,
			idleImapInstances,
			imapInstances,
		);
	}
};
