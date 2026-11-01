import { db, identities, IdentityEntity, mailboxes, mailboxSync } from "@db";
import { eq } from "drizzle-orm";
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
} from "./discover-helpers";
import { ensureTrashFolder } from "./discover-trash";

export const discoverMailboxes = async (
	client: ImapFlow,
	identityId: string,
	workspaceId: string,
) => {
	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId));

	if (!identity) return;

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

	const allBoxes: ImapBox[] = await client.list();
	const isGmail = isGmailAccountFromBoxes(allBoxes);
	// const boxes = allBoxes.filter((mbx) => shouldSyncBox(mbx, isGmail));
	const isMicrosoft = identity.metaData?.provider === "microsoft";
	const boxes = allBoxes.filter((mbx) =>
		shouldSyncBox(mbx, isGmail, isMicrosoft),
	);

	for (const mbx of boxes) {
		const path = mbx.path;
		const delimiter = mbx.delimiter || "/";
		let { parentPath, name } = splitParent(path, delimiter);

		if (isGmail && parentPath === "[Gmail]") {
			parentPath = "";
		}

		const flags = Array.from(mbx.flags ?? []);
		const selectable =
			!flags.includes("\\Noselect") &&
			!flags.includes("\\NonExistent");

		const parentId = await ensureParentChain({
			identity,
			parentPath,
			delimiter,
			pathIdMap,
		});

		const existingByPath = await findLocalByPath(identity.id, path);

		const kind = inferKind(
			mbx.name,
			mbx.specialUse as string | undefined,
		);

		const existing = existingByPath ?? (
			identity.metaData?.provider === "kurrier-mail"
				? locals.find(
					(local) =>
						local.kind === kind &&
						kind !== "custom" &&
						!(local.metaData as any)?.imap?.path,
				)
				: undefined
		);

		const meta = {
			...(existing?.metaData ?? {}),
			imap: {
				...(existing?.metaData as any)?.imap,
				path,
				pathAsListed: mbx.pathAsListed ?? path,
				name,
				parentPath,
				delimiter,
				flags,
				specialUse: (mbx.specialUse as string) ?? null,
				selectable,
				exists: !flags.includes("\\NonExistent"),
			},
		};

		const valuesBase = {
			ownerId: identity.ownerId,
			workspaceId,
			identityId: identity.id,
			parentId,
			name,
			slug: slugify(path.toLowerCase()),
			kind,
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
				const box = await client.mailboxOpen(path, {
					readOnly: true,
				});

				await db.insert(mailboxSync).values({
					identityId: identity.id,
					mailboxId: row.id,
					uidValidity: box.uidValidity!,
					lastSeenUid: 0,
					backfillCursorUid: Math.max(
						0,
						(box.uidNext ?? 1) - 1,
					),
					phase: "BACKFILL",
				});
			}
		} else {
			pathIdMap.set(path, existing.id);

			await db
				.update(mailboxes)
				.set({
					parentId,
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
					const box = await client.mailboxOpen(path, {
						readOnly: true,
					});

					await db.insert(mailboxSync).values({
						identityId: identity.id,
						mailboxId: existing.id,
						uidValidity: box.uidValidity!,
						lastSeenUid: 0,
						backfillCursorUid: Math.max(
							0,
							(box.uidNext ?? 1) - 1,
						),
						phase: "BACKFILL",
					});
				}
			}
		}
	}

	await ensureTrashFolder(client, identity as IdentityEntity);
};
