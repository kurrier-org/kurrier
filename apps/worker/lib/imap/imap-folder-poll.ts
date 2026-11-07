import { db, identities, mailboxes } from "@db";
import { eq } from "drizzle-orm";
import type { ImapFlow } from "imapflow";
import { MailboxStore } from "@providers";
import { initSmtpClient } from "./imap-client";
import { getRedis } from "../get-redis";
import {
	isGmailAccountFromBoxes,
	shouldSyncBox,
} from "./backfill/discover/discover-gmail";

export async function pollImapFolders(
	identityId: string,
	workspaceId: string,
	imapInstances: Map<string, ImapFlow>,
) {
	const client = await initSmtpClient(identityId, imapInstances);

	if (!client?.authenticated || !client.usable) {
		return;
	}

	const allBoxes = await client.list();

	const [identity] = await db
		.select({
			ownerId: identities.ownerId,
			metaData: identities.metaData,
		})
		.from(identities)
		.where(eq(identities.id, identityId))
		.limit(1);

	if (!identity) {
		return;
	}

	const isGmail = isGmailAccountFromBoxes(allBoxes);
	const isMicrosoft = identity.metaData?.provider === "microsoft";

	const allowedBoxes = allBoxes.filter(
		(box) =>
			!box.flags?.has("\\NonExistent") &&
			shouldSyncBox(box, isGmail, isMicrosoft),
	);

	const remotePaths = new Set(allowedBoxes.map((box) => box.path));

	const remote = allowedBoxes.sort(
		(a, b) =>
			a.path.split(a.delimiter || "/").length -
			b.path.split(b.delimiter || "/").length,
	);

	const local = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.identityId, identityId));

	const existing = new Map(
		local
			.map(
				(folder) =>
					[
						(folder.metaData as any)?.imap?.path as string | undefined,
						folder.id,
					] as const,
			)
			.filter((entry): entry is readonly [string, string] => Boolean(entry[0])),
	);

	let createdCount = 0;

	for (const box of remote) {
		if (existing.has(box.path)) {
			continue;
		}

		const delimiter = box.delimiter || "/";
		const separator = box.path.lastIndexOf(delimiter);

		const parentPath = separator >= 0 ? box.path.slice(0, separator) : "";

		const parentId = parentPath ? existing.get(parentPath) : undefined;

		if (parentPath && !parentId) {
			console.warn(
				`[folder-poll:${identityId}] parent missing for ${box.path}`,
			);
			continue;
		}

		try {
			const status = await client.status(box.path, {
				uidValidity: true,
				uidNext: true,
			});

			if (status.uidValidity == null || status.uidNext == null) {
				console.warn(
					`[folder-poll:${identityId}] missing UID state for ${box.path}`,
				);
				continue;
			}

			const name =
				separator >= 0
					? box.path.slice(separator + delimiter.length)
					: box.path;

			const folder = await MailboxStore.createFolder({
				identityId,
				ownerId: identity.ownerId,
				workspaceId,
				parentId,
				name,
				path: box.path,
				delimiter,
				imap: {
					uidValidity: BigInt(status.uidValidity),
					uidNext: Number(status.uidNext),
				},
			});

			existing.set(box.path, folder.id);
			createdCount++;

			console.info(`[folder-poll:${identityId}] created ${box.path}`);
		} catch (err) {
			console.error(
				`[folder-poll:${identityId}] failed to create ${box.path}`,
				err,
			);
		}
	}

	const missing = local
		.filter((folder) => {
			const path = (folder.metaData as any)?.imap?.path as string | undefined;

			return (
				path &&
				!folder.isDefault &&
				path.toUpperCase() !== "INBOX" &&
				!remotePaths.has(path)
			);
		})
		.sort(
			(a, b) =>
				((b.metaData as any)?.imap?.path as string).length -
				((a.metaData as any)?.imap?.path as string).length,
		);

	for (const folder of missing) {
		const path = (folder.metaData as any).imap.path as string;

		try {
			await MailboxStore.deleteFolder(folder.id);

			console.info(`[folder-poll:${identityId}] deleted ${path}`);
		} catch (err) {
			console.error(
				`[folder-poll:${identityId}] failed to delete ${path}`,
				err,
			);
		}
	}

	if (createdCount > 0) {
		const { imapBackfillQueue } = await getRedis();

		await imapBackfillQueue.add(
			"imap:backfill-account",
			{ identityId },
			{
				jobId: `imap-backfill-account-${identityId}`,
				removeOnComplete: true,
				removeOnFail: true,
			},
		);

		console.info(
			`[folder-poll:${identityId}] queued backfill for ${createdCount} new folders`,
		);
	}
}
