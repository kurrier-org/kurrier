import { db, messages, mailboxThreads, threads } from "@db";
import { and, eq, inArray, notExists, sql } from "drizzle-orm";

type DeleteInput = {
	mailboxId: string;
	threadIds?: string[];
};

export async function deleteMailboxMessages({
	mailboxId,
	threadIds,
}: DeleteInput): Promise<string[]> {
	return db.transaction(async (tx) => {
		if (threadIds && !threadIds.length) return [];

		const condition = threadIds
			? and(
					eq(messages.mailboxId, mailboxId),
					inArray(messages.threadId, threadIds),
				)
			: eq(messages.mailboxId, mailboxId);

		const rows = await tx
			.delete(messages)
			.where(condition)
			.returning({ threadId: messages.threadId });

		const affectedThreadIds = [...new Set(rows.map((row) => row.threadId))];

		if (!affectedThreadIds.length) return [];

		await tx
			.delete(mailboxThreads)
			.where(
				and(
					eq(mailboxThreads.mailboxId, mailboxId),
					inArray(mailboxThreads.threadId, affectedThreadIds),
				),
			);

		await tx
			.delete(threads)
			.where(
				and(
					inArray(threads.id, affectedThreadIds),
					notExists(
						tx
							.select({ one: sql`1` })
							.from(messages)
							.where(eq(messages.threadId, threads.id)),
					),
				),
			);

		return affectedThreadIds;
	});
}
