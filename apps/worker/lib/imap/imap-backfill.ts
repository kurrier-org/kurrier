import { FetchMessageObject, ImapFlow } from "imapflow";
import {
	db,
	identities,
	type IdentityEntity,
	MailboxEntity,
	mailboxes,
	mailboxSync,
} from "@db";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { parseAndStoreEmail } from "../message-payload-parser";
import { sleep } from "./imap-sync-mailbox";
import slugify from "@sindresorhus/slugify";
import { MailboxKind } from "@schema";

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
                    const flags = Array.from(msg.flags ?? []);

					await parseAndStoreEmail(raw, {
						ownerId,
						mailboxId,
						rawStorageKey: `eml/${ownerId}/${mailboxId}/${msg.id}.eml`,
						emlKey: String(msg.id),
						metaData: {
							imap: {
								uid: msg.uid,
								mailboxPath: path,
                                flags
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

	await client.mailboxOpen(path, { readOnly: true });

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

function splitParent(path: string, delimiter: string) {
	const idx = path.lastIndexOf(delimiter);
	if (idx < 0) return { parentPath: "", name: path };
	return { parentPath: path.slice(0, idx), name: path.slice(idx + 1) };
}

// cache: path -> mailbox id (for this sync run)
type PathIdMap = Map<string, string>;

async function findLocalByPath(identityId: string, path: string) {
	const [row] = await db
		.select()
		.from(mailboxes)
		.where(
			and(
				eq(mailboxes.identityId, identityId),
				sql`${mailboxes.metaData}->'imap'->>'path' = ${path}`,
			),
		);
	return row as MailboxEntity | undefined;
}

// Ensure a parent exists for given path; create placeholder chain if needed.
// Returns the parent's id (or null for root).
async function ensureParentChain({
	identity,
	parentPath,
	delimiter,
	pathIdMap,
}: {
	identity: IdentityEntity;
	parentPath: string;
	delimiter: string;
	pathIdMap: PathIdMap;
}): Promise<string | null> {
	if (!parentPath) return null;

	// fast cache hit
	const cached = pathIdMap.get(parentPath);
	if (cached) return cached;

	// does it already exist in DB?
	const existing = await findLocalByPath(identity.id, parentPath);
	if (existing) {
		pathIdMap.set(parentPath, existing.id);
		return existing.id;
	}

	// create ancestor(s) first
	const { parentPath: pp2, name: parentName } = splitParent(
		parentPath,
		delimiter,
	);
	const grandId = await ensureParentChain({
		identity,
		parentPath: pp2,
		delimiter,
		pathIdMap,
	});

	// insert placeholder parent (non-selectable)
	const [parentRow] = await db
		.insert(mailboxes)
		.values({
			ownerId: identity.ownerId,
			identityId: identity.id,
			parentId: grandId, // NEW
			name: parentName,
			slug: slugify(parentPath),
			kind: "custom",
			isDefault: false,
			metaData: {
				imap: {
					path: parentPath,
					name: parentName,
					parentPath: pp2,
					delimiter,
					flags: ["\\Noselect"],
					specialUse: null,
					selectable: false,
				},
			},
		} as any)
		.returning();

	pathIdMap.set(parentPath, parentRow.id);
	return parentRow.id;
}

function inferKind(mbxName: string, specialUse?: string): MailboxKind {
	if (specialUse === "\\Inbox") return "inbox";
	if (specialUse === "\\Sent") return "sent";
	if (specialUse === "\\Drafts") return "drafts";
	if (specialUse === "\\Junk") return "spam";
	if (specialUse === "\\Trash") return "trash";
	if (specialUse === "\\Archive") return "archive";
	const n = (mbxName || "").toLowerCase();
	if (["inbox"].includes(n)) return "inbox";
	if (["sent", "sent mail", "sent messages"].includes(n)) return "sent";
	if (["drafts", "draft"].includes(n)) return "drafts";
	if (["junk", "spam"].includes(n)) return "spam";
	if (["trash", "deleted items", "deleted messages", "bin"].includes(n))
		return "trash";
	if (["archive", "all mail"].includes(n)) return "archive";
	return "custom";
}

const TRASH_NAME_CANDIDATES = [
	"trash",
	"deleted items",
	"deleted messages",
	"deleted",
	"bin",
	"rubbish",
	"[gmail]/trash",
	"[gmail]/bin",
	"papierkorb",
	"corbeille",
	"cestino",
	"papelera",
];

function isTrashName(mbx: { path: string; name: string }) {
	const p = (mbx.path || "").toLowerCase();
	const n = (mbx.name || "").toLowerCase();
	// match exact well-known names, and suffix-based matches on both common delimiters
	return (
		TRASH_NAME_CANDIDATES.some((c) => p === c || n === c) ||
		p.endsWith("/trash") ||
		p.endsWith(".trash") ||
		n.endsWith("/trash") ||
		n.endsWith(".trash")
	);
}

async function ensureTrashFolder(client: ImapFlow, identity: IdentityEntity) {
	// 1) Re-list to be sure we include anything created in this run
	const all: Array<any> = [];
	for await (const mbx of await client.list()) all.push(mbx);

	// 1a) Look for SPECIAL-USE \Trash (authoritative)
	let trash = all.find(
		(m) => (m.specialUse as string | undefined) === "\\Trash",
	);

	// 1b) If not marked, look for common names/paths
	if (!trash)
		trash = all.find((m) => isTrashName({ path: m.path, name: m.name }));

	if (trash) {
		// We already upserted mailboxes in the main loop, so nothing to do.
		return;
	}

	// 2) Try to create a Trash on the server
	const tryNames = ["Trash", "Deleted Items"];
	for (const name of tryNames) {
		try {
			await client.mailboxCreate(name);
			// Open once to seed mailbox_sync like in your main code
			const box = await client.mailboxOpen(name, { readOnly: true });
			const [row] = await db
				.insert(mailboxes)
				.values({
					ownerId: identity.ownerId,
					identityId: identity.id,
					name,
					// slug: encodeMailboxPath(name),
					slug: slugify(name),
					kind: "trash",
					isDefault: false,
					metaData: {
						imap: {
							path: name,
							name,
							parentPath: "",
							delimiter: ".",
							flags: [],
							specialUse: null, // server may not mark it; we still treat as trash
							selectable: true,
						},
					},
				} as any)
				.onConflictDoNothing?.()
				.returning();

			if (row) {
				await db.insert(mailboxSync).values({
					identityId: identity.id,
					mailboxId: row.id,
					uidValidity: box.uidValidity!,
					lastSeenUid: 0,
					backfillCursorUid: Math.max(0, (box.uidNext ?? 1) - 1),
					phase: "BACKFILL",
				});
			}
			return; // success
		} catch {
			/* try next name */
		}
	}

	// 3) If server refuses creation, ensure a local-only Trash placeholder
	const existingLocalTrash = await db
		.select()
		.from(mailboxes)
		.where(
			and(
				eq(mailboxes.identityId, identity.id),
				or(eq(mailboxes.kind, "trash"), eq(mailboxes.slug, "trash")),
			),
		);

	if (!existingLocalTrash.length) {
		await db.insert(mailboxes).values({
			ownerId: identity.ownerId,
			identityId: identity.id,
			name: "Trash",
			slug: "trash",
			kind: "trash",
			isDefault: false,
			metaData: {
				imap: {
					path: null, // local-only
					name: "Trash",
					parentPath: "",
					delimiter: ".",
					flags: [],
					specialUse: null,
					selectable: false, // not on server
				},
			},
		} as any);
	}
}

export const syncMailboxEntities = async (
	client: ImapFlow,
	identity: IdentityEntity,
) => {
	const locals = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.identityId, identity.id));
	const pathIdMap: PathIdMap = new Map(
		locals
			.map(
				(l) =>
					[
						((l.metaData as any)?.imap?.path ?? null) as string | null,
						l.id,
					] as const,
			)
			.filter(([p]) => !!p) as [string, string][],
	);

	const touched = new Set<string>();

	for await (const mbx of await client.list()) {
		const path = mbx.path;
		const delimiter = mbx.delimiter || "/";
		const { parentPath, name } = splitParent(path, delimiter);

		const flags = Array.from(mbx.flags ?? []);
		const selectable = !flags.includes("\\Noselect");
		touched.add(path);

		// NEW: ensure parent exists and get parentId (null for root)
		const parentId = await ensureParentChain({
			identity,
			parentPath,
			delimiter,
			pathIdMap,
		});

		const meta = {
			...(locals.find((l) => (l?.metaData as any)?.imap?.path === path)
				?.metaData ?? {}),
			imap: {
				path,
				pathAsListed: mbx.pathAsListed ?? path,
				name,
				parentPath,
				delimiter,
				flags,
				specialUse: (mbx.specialUse as string) ?? null,
				selectable,
			},
		};

		// look up existing by path
		let existing = await findLocalByPath(identity.id, path);

		const valuesBase = {
			ownerId: identity.ownerId,
			identityId: identity.id,
			parentId, // NEW
			name,
			slug: slugify(mbx.name.toLowerCase()),
			kind: inferKind(mbx.name, mbx.specialUse as string | undefined),
			isDefault: path === "INBOX",
			metaData: meta,
		};

		if (!existing) {
			const [row] = await db
				.insert(mailboxes)
				.values(valuesBase as any)
				.returning();
			pathIdMap.set(path, row.id); // keep map fresh

			if (selectable) {
				const box = await client.mailboxOpen(path, { readOnly: true });
				await db.insert(mailboxSync).values({
					identityId: identity.id,
					mailboxId: row.id,
					uidValidity: box.uidValidity!,
					lastSeenUid: 0,
					backfillCursorUid: Math.max(0, (box.uidNext ?? 1) - 1),
					phase: "BACKFILL",
				});
			}
		} else {
			await db
				.update(mailboxes)
				.set({
					parentId, // NEW (moves in hierarchy are captured)
					name,
					slug: slugify(path.toLowerCase()),
					metaData: meta as any,
					updatedAt: new Date(),
				} as any)
				.where(eq(mailboxes.id, existing.id));

			if (selectable) {
				const [maybeSync] = await db
					.select()
					.from(mailboxSync)
					.where(eq(mailboxSync.mailboxId, existing.id));
				if (!maybeSync) {
					const box = await client.mailboxOpen(path, { readOnly: true });
					await db.insert(mailboxSync).values({
						identityId: identity.id,
						mailboxId: existing.id,
						uidValidity: box.uidValidity!,
						lastSeenUid: 0,
						backfillCursorUid: Math.max(0, (box.uidNext ?? 1) - 1),
						phase: "BACKFILL",
					});
				}
			}
		}
	}

	// vanished -> mark non-selectable (keeps parentId as-is; you can null it if you prefer)
	const vanished = (
		await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.identityId, identity.id))
	).filter((l) => {
		const p = (l?.metaData as any)?.imap?.path as string | undefined;
		return p && !touched.has(p);
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

	await ensureTrashFolder(client, identity); // works unchanged; it will insert parentId=null
};
