import { db, mailboxes, mailboxSync } from "@db";
import type { MailboxKind } from "@schema";
import slugify from "@sindresorhus/slugify";

type CreateFolderInput = {
	identityId: string;
	ownerId: string;
	workspaceId: string;
	parentId?: string | null;
	name: string;
	path: string;
	delimiter: string;
	kind?: MailboxKind;
	imap?: {
		uidValidity: bigint;
		uidNext: number;
	};
};

export async function createMailboxFolder(input: CreateFolderInput) {
	const parentPath = input.parentId
		? input.path.slice(0, input.path.lastIndexOf(input.delimiter))
		: "";

	try {
		return await db.transaction(async (tx) => {
			const [mailbox] = await tx
				.insert(mailboxes)
				.values({
					identityId: input.identityId,
					ownerId: input.ownerId,
					workspaceId: input.workspaceId,
					parentId: input.parentId?.trim() || null,
					name: input.name,
					slug: slugify(input.name.toLowerCase()),
					kind: input.kind ?? "custom",
					isDefault: false,
					metaData: input.imap
						? {
								imap: {
									path: input.path,
									name: input.name,
									parentPath,
									delimiter: input.delimiter,
									flags: [],
									specialUse: null,
									selectable: true,
								},
							}
						: {},
				})
				.returning();

			if (input.imap) {
				const top = Math.max(0, input.imap.uidNext - 1);

				await tx.insert(mailboxSync).values({
					identityId: input.identityId,
					mailboxId: mailbox.id,
					uidValidity: input.imap.uidValidity,
					lastSeenUid: 0,
					backfillCursorUid: top,
					phase: top > 0 ? "BACKFILL" : "IDLE",
					syncedAt: new Date(),
				});
			}

			return mailbox;
		});
	} catch (err: any) {
		console.error("[createFolder] PostgreSQL error:", {
			message: err.message,
			cause: err.cause,
			code: err.cause?.code,
			constraint: err.cause?.constraint,
			detail: err.cause?.detail,
		});

		throw err;
	}
}
