import { FetchMessageObject, ImapFlow } from "imapflow";
import {
	db,
	identities,
	type IdentityEntity,
	type MailboxCreate,
	mailboxes,
	MailboxInsertSchema,
	mailboxSync,
	MailboxSyncInsertSchema,
	type MailboxUpdate,
	MailboxUpdateSchema,
} from "@db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { parseAndStoreEmail } from "../message-payload-parser";
import { sleep } from "./imap-sync-mailbox";
import slugify from "@sindresorhus/slugify";
import { mailboxKindsList } from "@schema";

function mapImapFlags(flags?: string[] | Set<string>) {
	const f = Array.isArray(flags) ? flags : Array.from(flags ?? []);
	const has = (x: string) => f.some((v) => v.toLowerCase() === x.toLowerCase());

	return {
		seen: has("\\Seen"),
		answered: has("\\Answered"),
		flagged: has("\\Flagged"), // v1: ignore Apple Mail $Label* (colored flags)
		draft: has("\\Draft"),
	};
}

export const startBackfill = async (client: ImapFlow, identityId: string) => {
	try {
		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId));
		if (!identity) return;

		const ownerId = identity.ownerId;

		await syncMailboxEntities(client, identity);

		const mailboxRows = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.identityId, identityId));
		for (const row of mailboxRows) {
			await backfillMailbox({
				client,
				identityId,
				mailboxId: row.id,
				path: String(row?.metaData?.imap.path),
				window: 500,
				onMessage: async (
					msg: FetchMessageObject,
					path: string,
					identityId: string,
					mailboxId: string,
				) => {
					const raw = (await msg?.source?.toString()) || "";

					const { seen, answered, flagged } = mapImapFlags(msg.flags);

					await parseAndStoreEmail(raw, {
						ownerId,
						mailboxId,
						rawStorageKey: `eml/${ownerId}/${mailboxId}/${msg.id}.eml`,
						emlKey: String(msg.id),
						metaData: {
							imap: {
								uid: msg.uid,
								mailboxPath: path,
							},
						},
						seen,
						answered,
						flagged,
					});
					return;
				},
			});
		}
	} catch (err) {
		console.error("Backfill error", err);
	}
};

async function backfillMailbox(opts: {
	client: ImapFlow;
	identityId: string;
	mailboxId: string;
	path: string; // IMAP path, e.g. "INBOX"
	window?: number; // batch size (default 500)
	politeWaitMs?: number; // small delay between batches (default 20ms)
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
		politeWaitMs = 50,
		onMessage,
	} = opts;

	// Ensure mailbox is open (read-only is fine)
	await client.mailboxOpen(path, { readOnly: true });

	// Load current cursor
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
		throw new Error(`mailbox_sync row missing for mailboxId=${mailboxId}`);
	}

	let cursor = Number(sync.backfillCursorUid || 0);
	// if (cursor <= 0) {
	// 	// nothing to do
	// 	return;
	// }

	if (cursor <= 0) {
		const head = await client.mailboxOpen(path, { readOnly: true });
		const top = Math.max(0, (head.uidNext ?? 1) - 1);

		await db
			.update(mailboxSync)
			.set({
				phase: "IDLE",
				syncedAt: new Date(),
				lastSeenUid: top,
				backfillCursorUid: 0,
				updatedAt: new Date(),
			})
			.where(eq(mailboxSync.id, sync.id));

		return;
	}

	// Mark phase explicitly
	await db
		.update(mailboxSync)
		.set({ phase: "BACKFILL", updatedAt: new Date() })
		.where(eq(mailboxSync.id, sync.id));

	while (cursor > 0) {
		const end = cursor;
		const start = Math.max(1, end - window + 1);

		// Fetch this window (UID range)
		const range = `${start}:${end}`;
		for await (const msg of client.fetch(
			{ uid: range },
			{
				uid: true,
				envelope: true,
				flags: true,
				internalDate: true,
				size: true,
				source: true, // raw RFC822
			},
		)) {
			await onMessage(msg, path, identityId, mailboxId);
		}

		// Move cursor backward and persist
		cursor = start - 1;
		await db
			.update(mailboxSync)
			.set({ backfillCursorUid: cursor, updatedAt: new Date() })
			.where(eq(mailboxSync.id, sync.id));

		if (politeWaitMs) await sleep(politeWaitMs);
	}

	// Done! compute head *after* loop and seed lastSeen for delta
	const headAtFinish = await client.mailboxOpen(path, { readOnly: true });
	const topAtFinish = Math.max(0, (headAtFinish.uidNext ?? 1) - 1);

	await db
		.update(mailboxSync)
		.set({
			phase: "IDLE",
			syncedAt: new Date(),
			lastSeenUid: topAtFinish, // seed delta starting point
			backfillCursorUid: 0, // mark backfill complete
			updatedAt: new Date(),
		})
		.where(eq(mailboxSync.id, sync.id));
}

const syncMailboxEntities = async (
	client: ImapFlow,
	identity: IdentityEntity,
): Promise<void> => {
	const locals = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.identityId, identity.id));

	const touched: string[] = [];
	let remoteTrashPath: string | null = null; // track \Trash

	// 1) Walk server folders
	for await (const mbx of await client.list()) {
		const path = mbx.path;
		const selectable = !Array.from(mbx.flags.values()).includes("\\Noselect");
		if (!selectable) continue;

		touched.push(path);

		// remember server's Trash if present
		if ((mbx.specialUse as string | undefined) === "\\Trash") {
			remoteTrashPath = path;
		}

		const local = locals.find(
			(l) => (l?.metaData?.imap?.path as string | undefined) === path,
		);

		const meta = {
			...(local?.metaData ?? {}),
			imap: {
				path,
				flags: Array.from(mbx.flags ?? []),
				specialUse: (mbx.specialUse as string) ?? null,
				selectable: true,
			},
		};

		if (!local) {
			// insert new mailbox
			const slugifiedName = slugify(mbx.name.toLowerCase());
			const parsedData = MailboxInsertSchema.parse({
				ownerId: identity.ownerId,
				identityId: identity.id,
				name: mbx.name,
				slug: slugifiedName,
				kind:
					(mbx.specialUse as string | undefined) === "\\Trash"
						? "trash"
						: (mailboxKindsList as readonly string[]).includes(slugifiedName)
							? (slugifiedName as (typeof mailboxKindsList)[number])
							: "custom",
				isDefault: path === "INBOX",
				metaData: meta,
			});
			const [newMailbox] = await db
				.insert(mailboxes)
				.values(parsedData as MailboxCreate)
				.returning();

			// seed mailbox_sync
			const box = await client.mailboxOpen(path, { readOnly: true });
			const uidValidity = box.uidValidity!;
			const backfillCursorUid = Math.max(0, (box.uidNext ?? 1) - 1);

			const mailboxSyncData = MailboxSyncInsertSchema.parse({
				identityId: identity.id,
				mailboxId: newMailbox.id,
				uidValidity,
				lastSeenUid: 0,
				backfillCursorUid,
				phase: "BACKFILL",
			});
			await db.insert(mailboxSync).values(mailboxSyncData);
		} else {
			// update existing mailbox metadata
			const parsedData = MailboxUpdateSchema.parse({
				name: mbx.name,
				slug: slugify(mbx.name || path),
				metaData: meta as any,
				updatedAt: new Date(),
			}) as MailboxUpdate;
			await db
				.update(mailboxes)
				.set(parsedData)
				.where(eq(mailboxes.id, local.id));

			// ensure mailbox_sync exists
			const [maybeSync] = await db
				.select()
				.from(mailboxSync)
				.where(eq(mailboxSync.mailboxId, local.id));
			if (!maybeSync) {
				const box = await client.mailboxOpen(path, { readOnly: true });
				const uidValidity = box.uidValidity!;
				const top = Math.max(0, (box.uidNext ?? 1) - 1);
				const mailboxSyncData = MailboxSyncInsertSchema.parse({
					identityId: identity.id,
					mailboxId: local.id,
					uidValidity,
					lastSeenUid: 0,
					backfillCursorUid: top,
					phase: "BACKFILL",
				});
				await db.insert(mailboxSync).values(mailboxSyncData);
			}
		}
	}

	// 2) Ensure there is a Trash mailbox (create if missing)
	if (!remoteTrashPath) {
		try {
			// try to create a top-level Trash on the server
			await client.mailboxCreate("Trash");
			remoteTrashPath = "Trash";
			touched.push(remoteTrashPath);

			// open it to get UID state
			const box = await client.mailboxOpen(remoteTrashPath, { readOnly: true });
			const uidValidity = box.uidValidity!;
			const backfillCursorUid = Math.max(0, (box.uidNext ?? 1) - 1);

			// see if we already had a local row pointing to this path
			const existing = locals.find(
				(l) =>
					(l?.metaData?.imap?.path as string | undefined) === remoteTrashPath,
			);

			if (!existing) {
				const parsedData = MailboxInsertSchema.parse({
					ownerId: identity.ownerId,
					identityId: identity.id,
					name: "Trash",
					slug: "trash",
					kind: "trash",
					isDefault: false,
					metaData: {
						imap: {
							path: remoteTrashPath,
							flags: [],
							specialUse: null, // server might not mark it; we still treat it as trash locally
							selectable: true,
						},
					},
				});
				const [trashMailbox] = await db
					.insert(mailboxes)
					.values(parsedData as MailboxCreate)
					.returning();

				const mailboxSyncData = MailboxSyncInsertSchema.parse({
					identityId: identity.id,
					mailboxId: trashMailbox.id,
					uidValidity,
					lastSeenUid: 0,
					backfillCursorUid,
					phase: "BACKFILL",
				});
				await db.insert(mailboxSync).values(mailboxSyncData);
			} else {
				// make sure its kind is trash if we rediscovered it
				await db
					.update(mailboxes)
					.set({
						kind: "trash",
						updatedAt: new Date(),
						metaData: sql`jsonb_set(coalesce(meta_data,'{}'::jsonb), '{imap,selectable}', 'true'::jsonb, true)`,
					} as any)
					.where(eq(mailboxes.id, existing.id));
			}
		} catch (e) {
			// If server refuses creation, we still want a local Trash.
			// Create a local-only Trash (non-selectable remotely).
			const localTrash = locals.find(
				(l) => l.slug === "trash" || l.kind === "trash",
			);
			if (!localTrash) {
				const parsedData = MailboxInsertSchema.parse({
					ownerId: identity.ownerId,
					identityId: identity.id,
					name: "Trash",
					slug: "trash",
					kind: "trash",
					isDefault: false,
					metaData: {
						imap: {
							path: null,
							flags: [],
							specialUse: null,
							selectable: false, // local-only fallback
						},
					},
				});
				await db.insert(mailboxes).values(parsedData as MailboxCreate);
				// no mailbox_sync, because we can't sync a local-only folder
			}
		}
	}

	// 3) Mark vanished as non-selectable
	const remoteSet = new Set(touched);
	const vanished = locals.filter((l) => {
		const p = l?.metaData?.imap?.path as string | undefined;
		return p && !remoteSet.has(p);
	});
	if (vanished.length) {
		await db
			.update(mailboxes)
			.set({
				metaData: sql`jsonb_set(coalesce(meta_data,'{}'::jsonb), '{imap,selectable}', 'false'::jsonb, true)`,
				updatedAt: new Date(),
			})
			.where(
				inArray(
					mailboxes.id,
					vanished.map((v) => v.id),
				),
			);
	}
};
