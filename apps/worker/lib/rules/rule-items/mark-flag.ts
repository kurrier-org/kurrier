import {db, mailboxThreads, messages} from "@db";
import { and, eq, sql } from "drizzle-orm";
import { getRedis } from "../../../lib/get-redis";

export const toggleStar = async (
    threadId: string,
    mailboxId: string,
    starred: boolean,
    imap: boolean,
) => {

    if (!threadId || !mailboxId) return;
    const { smtpQueue, searchIngestQueue } = await getRedis();

    if (imap) {
        await smtpQueue.add(
            "mail:set-flags",
            {
                threadId,
                mailboxId,
                op: "flag",
            },
            {
                attempts: 3,
                backoff: { type: "exponential", delay: 1500 },
                removeOnComplete: true,
                removeOnFail: true,
            },
        );
    } else {

        const op = "flag";
        const update: Record<string, any> = { updatedAt: new Date() };
        if (op === "flag") update.flagged = true;

        await db
            .update(messages)
            .set(update)
            .where(
                and(
                    eq(messages.threadId, threadId),
                    eq(messages.mailboxId, mailboxId),
                ),
            );

        const [agg] = await db
            .select({
                unreadCount: sql<number>`count(*) filter (where
                    ${messages.seen}
                    =
                    false
                    )`,
                anyFlagged: sql<boolean>`bool_or
                    (
                    ${messages.flagged}
                    )`,
            })
            .from(messages)
            .where(
                and(
                    eq(messages.threadId, threadId),
                    eq(messages.mailboxId, mailboxId),
                ),
            );

        await db
            .update(mailboxThreads)
            .set({
                unreadCount: agg.unreadCount ?? 0,
                starred: agg.anyFlagged ?? false,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(mailboxThreads.threadId, threadId),
                    eq(mailboxThreads.mailboxId, mailboxId),
                ),
            );
    }

    await searchIngestQueue.add(
        "refresh-thread",
        { threadId: threadId },
        {
            jobId: `refresh-${threadId}`,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: "exponential", delay: 1500 },
        },
    );

};
