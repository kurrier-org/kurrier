import { db, identities, mailboxes, mailboxSync } from "@db";
import { eq, inArray, sql } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import slugify from "@sindresorhus/slugify";
import {
	ImapBox,
	isGmailAccountFromBoxes,
	shouldSyncBox,
} from "./discover-gmail";
import {
	PathIdMap,
	splitParent,
	ensureParentChain,
	findLocalByPath,
	inferKind,
	getKindFromMapping,
} from "./discover-helpers";
import { FolderMappings } from "@schema";
import { ensureTrashFolder } from "./discover-trash";

export const discoverMailboxes = async (
	client: ImapFlow,
	identityId: string,
) => {
	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId));
	if (!identity) return;

	const folderMappings = (identity as any).folderMappings as FolderMappings | null;

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

	const allBoxes: ImapBox[] = await client.list();
	const isGmail = isGmailAccountFromBoxes(allBoxes);
	const boxes = allBoxes.filter((mbx) => shouldSyncBox(mbx, isGmail));

	for await (const mbx of boxes) {
		const path = mbx.path;
		const delimiter = mbx.delimiter || "/";
		let { parentPath, name } = splitParent(path, delimiter);

		if (isGmail && parentPath === "[Gmail]") {
			parentPath = "";
		}

		const flags = Array.from(mbx.flags ?? []);
		const selectable = !flags.includes("\\Noselect");
		touched.add(path);

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

		const existing = await findLocalByPath(identity.id, path);

		const valuesBase = {
			ownerId: identity.ownerId,
			identityId: identity.id,
			parentId,
			name,
			slug: slugify(mbx.name.toLowerCase()),
			kind: getKindFromMapping(path, folderMappings) ?? inferKind(mbx.name, mbx.specialUse as string | undefined),
			isDefault: path === "INBOX",
			metaData: meta,
		};

		if (!existing) {
			const [row] = await db
				.insert(mailboxes)
				.values(valuesBase as any)
				.returning();
			pathIdMap.set(path, row.id);

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
					parentId,
					name,
					slug: slugify(path.toLowerCase()),
					kind: getKindFromMapping(path, folderMappings) ?? inferKind(mbx.name, mbx.specialUse as string | undefined),
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
				metaData: sql`jsonb_set(coalesce(meta,'{}'::jsonb), '{imap,selectable}', 'false'::jsonb, true)`,
				updatedAt: new Date(),
			})
			.where(
				inArray(
					mailboxes.id,
					vanished.map((v) => v.id),
				),
			);
	}

	await ensureTrashFolder(client, identity);
};
