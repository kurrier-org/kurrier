import { db, mailboxes, type IdentityEntity, type MailboxEntity } from "@db";
import { and, eq, sql } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { MailboxKind } from "@schema";

export type PathIdMap = Map<string, string>;

export function splitParent(path: string, delimiter: string) {
	const idx = path.lastIndexOf(delimiter);
	if (idx < 0) return { parentPath: "", name: path };
	return { parentPath: path.slice(0, idx), name: path.slice(idx + 1) };
}

export async function findLocalByPath(identityId: string, path: string) {
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

export async function ensureParentChain(opts: {
	identity: IdentityEntity;
	parentPath: string;
	delimiter: string;
	pathIdMap: PathIdMap;
}): Promise<string | null> {
	const { identity, parentPath, delimiter, pathIdMap } = opts;

	if (!parentPath) return null;

	const cached = pathIdMap.get(parentPath);
	if (cached) return cached;

	const existing = await findLocalByPath(identity.id, parentPath);
	if (existing) {
		pathIdMap.set(parentPath, existing.id);
		return existing.id;
	}

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

	const [parentRow] = await db
		.insert(mailboxes)
		.values({
			ownerId: identity.ownerId,
			identityId: identity.id,
			parentId: grandId,
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

export function inferKind(mbxName: string, specialUse?: string): MailboxKind {
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
