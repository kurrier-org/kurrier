import { ImapFlow } from "imapflow";
import { db, mailboxes, mailboxSync, type IdentityEntity } from "@db";
import { and, eq, or } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { FolderMappings } from "@schema";

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

	return (
		TRASH_NAME_CANDIDATES.some((c) => p === c || n === c) ||
		p.endsWith("/trash") ||
		p.endsWith(".trash") ||
		n.endsWith("/trash") ||
		n.endsWith(".trash")
	);
}

export async function ensureTrashFolder(
	client: ImapFlow,
	identity: IdentityEntity,
) {
	const mappings = (identity as any).folderMappings as FolderMappings | null;
	if (mappings?.trash) return; // trust that discover-mailboxes already set kind=trash

	const all: Array<any> = [];
	for await (const mbx of await client.list()) all.push(mbx);

	let trash = all.find(
		(m) => (m.specialUse as string | undefined) === "\\Trash",
	);

	if (!trash) {
		trash = all.find((m) => isTrashName({ path: m.path, name: m.name }));
	}

	if (trash) {
		return;
	}

	const tryNames = ["Trash", "Deleted Items"];

	for (const name of tryNames) {
		try {
			await client.mailboxCreate(name);
			const box = await client.mailboxOpen(name, { readOnly: true });
			const [row] = await db
				.insert(mailboxes)
				.values({
					ownerId: identity.ownerId,
					identityId: identity.id,
					name,
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
							specialUse: null,
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
			return;
		} catch {}
	}

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
					path: null,
					name: "Trash",
					parentPath: "",
					delimiter: ".",
					flags: [],
					specialUse: null,
					selectable: false,
				},
			},
		} as any);
	}
}
