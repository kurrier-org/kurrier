import { db, type IdentityEntity, type MailboxEntity, mailboxes } from "@db";
import type { MailboxKind } from "@schema";
import slugify from "@sindresorhus/slugify";
import { and, eq, sql } from "drizzle-orm";

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

export function createParentMailboxValues(opts: {
	identity: Pick<IdentityEntity, "id" | "ownerId" | "workspaceId">;
	parentPath: string;
	parentId: string | null;
	delimiter: string;
}): typeof mailboxes.$inferInsert {
	const { identity, parentPath, parentId, delimiter } = opts;
	const { parentPath: grandparentPath, name: parentName } = splitParent(
		parentPath,
		delimiter,
	);

	return {
		ownerId: identity.ownerId,
		workspaceId: identity.workspaceId,
		identityId: identity.id,
		parentId,
		name: parentName,
		slug: slugify(parentPath),
		kind: "custom" as const,
		isDefault: false,
		metaData: {
			imap: {
				path: parentPath,
				name: parentName,
				parentPath: grandparentPath,
				delimiter,
				flags: ["\\Noselect"],
				specialUse: null,
				selectable: false,
			},
		},
	};
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

	const { parentPath: pp2 } = splitParent(parentPath, delimiter);
	const grandId = await ensureParentChain({
		identity,
		parentPath: pp2,
		delimiter,
		pathIdMap,
	});

	const [parentRow] = await db
		.insert(mailboxes)
		.values(
			createParentMailboxValues({
				identity,
				parentPath,
				parentId: grandId,
				delimiter,
			}),
		)
		.returning();

	pathIdMap.set(parentPath, parentRow.id);
	return parentRow.id;
}

export function inferKind(
	mbxName: string,
	specialUse?: string | null,
): MailboxKind {
	const role = specialUse?.toLowerCase();

	if (role === "\\inbox" || role === "inbox") return "inbox";
	if (role === "\\sent" || role === "sent") return "sent";
	if (role === "\\drafts" || role === "drafts") return "drafts";
	if (role === "\\junk" || role === "junk") return "spam";
	if (role === "\\trash" || role === "trash") return "trash";
	if (role === "\\archive" || role === "archive") return "archive";

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
