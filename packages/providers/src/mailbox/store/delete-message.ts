import { db, messages, mailboxThreads, threads } from "@db";
import { and, eq, notExists, sql } from "drizzle-orm";
import { upsertMailboxThreadItem } from "@common";

export async function deleteMailboxMessage(messageId: string) {
    return db.transaction(async (tx) => {
        const [message] = await tx
            .select({
                id: messages.id,
                threadId: messages.threadId,
                mailboxId: messages.mailboxId,
            })
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);

        if (!message) return null;

        await tx.delete(messages).where(eq(messages.id, message.id));

        const [remaining] = await tx
            .select({ id: messages.id })
            .from(messages)
            .where(
                and(
                    eq(messages.threadId, message.threadId),
                    eq(messages.mailboxId, message.mailboxId),
                ),
            )
            .limit(1);

        if (remaining) {
            await upsertMailboxThreadItem(remaining.id, tx);
        } else {
            await tx
                .delete(mailboxThreads)
                .where(
                    and(
                        eq(mailboxThreads.threadId, message.threadId),
                        eq(mailboxThreads.mailboxId, message.mailboxId),
                    ),
                );
        }

        await tx
            .delete(threads)
            .where(
                and(
                    eq(threads.id, message.threadId),
                    notExists(
                        tx
                            .select({ one: sql`1` })
                            .from(messages)
                            .where(eq(messages.threadId, threads.id)),
                    ),
                ),
            );

        return message.threadId;
    });
}
