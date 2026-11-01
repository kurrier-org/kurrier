import { db, mailboxes, messages, threads } from "@db";
import { and, eq, inArray, notExists, sql } from "drizzle-orm";

export async function deleteMailboxFolder(mailboxId: string) {
    return db.transaction(async (tx) => {
        const affected = await tx.execute(sql<{ thread_id: string }>`
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM mailboxes WHERE id = ${mailboxId}
                UNION ALL
                SELECT m.id
                FROM mailboxes m
                JOIN folder_tree ft ON m.parent_id = ft.id
            )
            SELECT DISTINCT msg.thread_id
            FROM messages msg
            JOIN folder_tree ft ON msg.mailbox_id = ft.id
        `);


        const threadIds: string[] = affected.map(
            (row) => row.thread_id as string,
        );

        await tx
            .delete(mailboxes)
            .where(eq(mailboxes.id, mailboxId));

        if (threadIds.length) {
            await tx
                .delete(threads)
                .where(
                    and(
                        inArray(threads.id, threadIds),
                        notExists(
                            tx
                                .select({ one: sql`1` })
                                .from(messages)
                                .where(eq(messages.threadId, threads.id)),
                        ),
                    ),
                );
        }
    });
}
