import { db, mailboxes, mailboxThreads, messages } from "@db";
import { upsertMailboxThreadItem } from "@common";
import { and, eq, inArray } from "drizzle-orm";

type MoveInput = {
	threadId: string;
	sourceMailboxId: string;
	destinationMailboxId: string;
	messageIds?: string[];
	uidMaps?: Map<string, Map<number, number>>;
};

export async function moveMailboxMessages(input: MoveInput) {
	const {
		threadId,
		sourceMailboxId,
		destinationMailboxId,
		messageIds,
		uidMaps,
	} = input;

	if (sourceMailboxId === destinationMailboxId) return;

	await db.transaction(async (tx) => {
		const [sourceMailbox] = await tx
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.id, sourceMailboxId))
			.limit(1);

		const [destinationMailbox] = await tx
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.id, destinationMailboxId))
			.limit(1);

		if (!sourceMailbox || !destinationMailbox) {
			throw new Error("Source or destination mailbox not found");
		}

		if (sourceMailbox.identityId !== destinationMailbox.identityId) {
			throw new Error("Cannot move messages between identities");
		}

		const sourceMessages = await tx
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.threadId, threadId),
					eq(messages.mailboxId, sourceMailboxId),
					...(messageIds ? [inArray(messages.id, messageIds)] : []),
				),
			);

		if (!sourceMessages.length) return;

		const destinationMessages = await tx
			.select({
				id: messages.id,
				messageId: messages.messageId,
			})
			.from(messages)
			.where(eq(messages.mailboxId, destinationMailboxId));

		const existingMessageIds = new Set(
			destinationMessages.map((message) => message.messageId),
		);

		const destinationPath =
			(destinationMailbox.metaData as any)?.imap?.path ??
			destinationMailbox.name;

		for (const message of sourceMessages) {
			if (existingMessageIds.has(message.messageId)) {
				await tx.delete(messages).where(eq(messages.id, message.id));

				continue;
			}

			const metaData = { ...(message.metaData ?? {}) };

			if (metaData.imap) {
				const oldUid = Number(metaData.imap.uid);
				const sourcePath = metaData.imap.mailboxPath;

				const newUid = uidMaps?.get(sourcePath)?.get(oldUid);

				const imap = {
					...metaData.imap,
					mailboxPath: destinationPath,
				};

				if (newUid !== undefined) {
					imap.uid = newUid;
				} else {
					delete imap.uid;
				}

				metaData.imap = imap;
			}

			await tx
				.update(messages)
				.set({
					mailboxId: destinationMailboxId,
					metaData,
					updatedAt: new Date(),
				})
				.where(eq(messages.id, message.id));

			existingMessageIds.add(message.messageId);
		}

		const [remainingSource] = await tx
			.select({ id: messages.id })
			.from(messages)
			.where(
				and(
					eq(messages.threadId, threadId),
					eq(messages.mailboxId, sourceMailboxId),
				),
			)
			.limit(1);

		if (remainingSource) {
			await upsertMailboxThreadItem(remainingSource.id, tx);
		} else {
			await tx
				.delete(mailboxThreads)
				.where(
					and(
						eq(mailboxThreads.threadId, threadId),
						eq(mailboxThreads.mailboxId, sourceMailboxId),
					),
				);
		}

		const [destinationMessage] = await tx
			.select({ id: messages.id })
			.from(messages)
			.where(
				and(
					eq(messages.threadId, threadId),
					eq(messages.mailboxId, destinationMailboxId),
				),
			)
			.limit(1);

		if (destinationMessage) {
			await upsertMailboxThreadItem(destinationMessage.id, tx);
		}
	});
}
