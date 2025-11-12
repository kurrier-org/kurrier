import { ImapFlow } from "imapflow";
import { db, mailboxes, mailboxSync } from "@db";
import { and, eq } from "drizzle-orm";

type DeleteFolderArgs = {
	mailboxId: string;
	identityId: string;
	ownerId: string;
};

export async function deleteFolder(args: DeleteFolderArgs, client: ImapFlow) {
	const [mbx] = await db
		.select()
		.from(mailboxes)
		.where(
			and(
				eq(mailboxes.id, args.mailboxId),
				eq(mailboxes.identityId, args.identityId),
			),
		)
		.limit(1);
	if (!mbx) throw new Error("Mailbox not found");
	if (mbx.isDefault) throw new Error("Cannot delete a default/system mailbox");

	const imap = mbx.metaData?.imap ?? {};
	const path = String(imap.path ?? "");
	if (!path) throw new Error("Mailbox path missing");

	const children = await db
		.select({ id: mailboxes.id })
		.from(mailboxes)
		.where(
			and(
				eq(mailboxes.identityId, args.identityId),
				eq(mailboxes.parentId, mbx.id),
			),
		);
	if (children.length)
		throw new Error("Folder has subfolders. Delete them first.");

	try {
		await client.mailboxDelete(path);
	} catch (err: any) {
		// treat "not found" as success
		if (!/not found|no such|does not exist/i.test(String(err?.message)))
			throw err;
	}

	await db.transaction(async (tx) => {
		await tx.delete(mailboxSync).where(eq(mailboxSync.mailboxId, mbx.id));
		await tx.delete(mailboxes).where(eq(mailboxes.id, mbx.id));
	});

	return { deletedId: mbx.id, path };
}
