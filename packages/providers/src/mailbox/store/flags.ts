import { db, messages, mailboxThreads } from "@db";
import { and, eq, sql } from "drizzle-orm";

type FlagsInput =
	| {
			threadId: string;
			mailboxId: string;
			op: "read" | "unread" | "flag" | "unflag" | "answered" | "unanswered";
	  }
	| {
			messageId: string;
			mailboxId: string;
			flags: {
				seen: boolean;
				flagged: boolean;
				answered: boolean;
			};
	  };

export async function setMailboxFlagsState(input: FlagsInput) {
	await db.transaction(async (tx) => {
		const now = new Date();

		let threadId: string;

		if ("messageId" in input) {
			const [message] = await tx
				.select({ threadId: messages.threadId })
				.from(messages)
				.where(
					and(
						eq(messages.id, input.messageId),
						eq(messages.mailboxId, input.mailboxId),
					),
				)
				.limit(1);

			if (!message) return;

			threadId = message.threadId;

			await tx
				.update(messages)
				.set({
					...input.flags,
					updatedAt: now,
				})
				.where(eq(messages.id, input.messageId));
		} else {
			threadId = input.threadId;

			const update = {
				updatedAt: now,
				...(input.op === "read" && { seen: true }),
				...(input.op === "unread" && { seen: false }),
				...(input.op === "flag" && { flagged: true }),
				...(input.op === "unflag" && { flagged: false }),
				...(input.op === "answered" && { answered: true }),
				...(input.op === "unanswered" && { answered: false }),
			};

			await tx
				.update(messages)
				.set(update)
				.where(
					and(
						eq(messages.threadId, threadId),
						eq(messages.mailboxId, input.mailboxId),
					),
				);
		}

		const [agg] = await tx
			.select({
				unreadCount: sql<number>`
					count(*) filter (where ${messages.seen} = false)
				`,
				starred: sql<boolean>`
					bool_or(${messages.flagged})
				`,
			})
			.from(messages)
			.where(
				and(
					eq(messages.threadId, threadId),
					eq(messages.mailboxId, input.mailboxId),
				),
			);

		await tx
			.update(mailboxThreads)
			.set({
				unreadCount: Number(agg?.unreadCount ?? 0),
				starred: Boolean(agg?.starred),
				updatedAt: now,
			})
			.where(
				and(
					eq(mailboxThreads.threadId, threadId),
					eq(mailboxThreads.mailboxId, input.mailboxId),
				),
			);
	});
}
