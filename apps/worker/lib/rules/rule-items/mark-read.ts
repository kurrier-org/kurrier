import {db, mailboxThreads, messages} from "@db";
import { and, eq, inArray } from "drizzle-orm";
import { getRedis } from "../../../lib/get-redis";

export const markAsRead = async (
        threadId: string,
        mailboxId: string,
        markSmtp: boolean,
    ) => {
        const ids = [threadId];

        if (!ids.length || !mailboxId) return;

        const now = new Date();
        await db
            .update(messages)
            .set({ seen: true, updatedAt: now })
            .where(
                and(
                    inArray(messages.threadId, ids),
                    eq(messages.mailboxId, mailboxId),
                ),
            );

        await db
            .update(mailboxThreads)
            .set({ unreadCount: 0, updatedAt: now })
            .where(
                and(
                    inArray(mailboxThreads.threadId, ids),
                    eq(mailboxThreads.mailboxId, mailboxId),
                ),
            );


        if (markSmtp) {
            const { smtpQueue, searchIngestQueue } = await getRedis();

            await Promise.all(
                ids.map((threadId) =>
                    smtpQueue.add(
                        "mail:set-flags",
                        { threadId, mailboxId, op: "read" },
                        {
                            attempts: 3,
                            backoff: { type: "exponential", delay: 1500 },
                            removeOnComplete: true,
                            removeOnFail: false,
                        },
                    ),
                ),
            );

            await Promise.all(
                ids.map((threadId) =>
                    searchIngestQueue.add(
                        "refresh-thread",
                        { threadId },
                        {
                            jobId: `refresh-${threadId}`,
                            removeOnComplete: true,
                            removeOnFail: false,
                            attempts: 3,
                            backoff: { type: "exponential", delay: 1500 },
                        },
                    ),
                ),
            );
        }
}
