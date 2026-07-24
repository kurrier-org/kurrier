import { and, eq, sql } from "drizzle-orm";
import { db, mailboxThreads, mailboxes, messages } from "@db";
import {gmailClientForIdentity} from "@providers";


type GmailSetFlagsArgs = {
    threadId: string;
    mailboxId: string;
    op: "read" | "unread" | "flag" | "unflag";
    messageId?: string;
};

export async function gmailSetFlags(args: GmailSetFlagsArgs) {
    console.log("args", args)
    const [mailbox] = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.id, args.mailboxId))
        .limit(1);

    if (!mailbox) throw new Error("Mailbox not found");

    const { gmail } = await gmailClientForIdentity(mailbox.identityId);

    const rows = await db
        .select({
            id: messages.id,
            gmailMessageId: sql<string | null>`
				${messages.metaData}->'gmail'->>'messageId'
			`,
            seen: messages.seen,
            flagged: messages.flagged,
            metaData: messages.metaData,
        })
        .from(messages)
        .where(
            and(
                eq(messages.threadId, args.threadId),
                eq(messages.mailboxId, args.mailboxId),
            ),
        );

    const targetRows = args.messageId
        ? rows.filter((row) => row.id === args.messageId)
        : rows;

    const addLabelIds: string[] = [];
    const removeLabelIds: string[] = [];

    if (args.op === "read") removeLabelIds.push("UNREAD");
    if (args.op === "unread") addLabelIds.push("UNREAD");
    if (args.op === "flag") addLabelIds.push("STARRED");
    if (args.op === "unflag") removeLabelIds.push("STARRED");

    for (const row of targetRows) {
        if (!row.gmailMessageId) continue;

        await gmail.users.messages.modify({
            userId: "me",
            id: row.gmailMessageId,
            requestBody: {
                addLabelIds,
                removeLabelIds,
            },
        });
    }

    await db.transaction(async (tx) => {
        for (const row of targetRows) {
            const update: Record<string, any> = {
                updatedAt: new Date(),
            };

            if (args.op === "read") update.seen = true;
            if (args.op === "unread") update.seen = false;
            if (args.op === "flag") update.flagged = true;
            if (args.op === "unflag") update.flagged = false;

            await tx
                .update(messages)
                .set(update)
                .where(eq(messages.id, row.id));
        }

        const [agg] = await tx
            .select({
                unreadCount: sql<number>`
					count(*) filter (where ${messages.seen} = false)
				`,
                anyFlagged: sql<boolean>`
					bool_or(${messages.flagged})
				`,
            })
            .from(messages)
            .where(
                and(
                    eq(messages.threadId, args.threadId),
                    eq(messages.mailboxId, args.mailboxId),
                ),
            );

        await tx
            .update(mailboxThreads)
            .set({
                unreadCount: Number(agg?.unreadCount ?? 0),
                starred: Boolean(agg?.anyFlagged ?? false),
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(mailboxThreads.threadId, args.threadId),
                    eq(mailboxThreads.mailboxId, args.mailboxId),
                ),
            );
    });

    return {
        success: true,
        updated: targetRows.length,
        op: args.op,
    };
}
