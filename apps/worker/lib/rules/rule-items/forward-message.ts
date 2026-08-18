import { db, mailboxes } from "@db";
import { and, eq } from "drizzle-orm";
import { getRedis } from "../../get-redis";

export const forwardMessage = async (
    originalMessageId: string,
    forwardTo: string[],
    identityId: string,
) => {
    if (!forwardTo?.length || !identityId) return;

    const [sentMailbox] = await db
        .select()
        .from(mailboxes)
        .where(and(eq(mailboxes.identityId, identityId), eq(mailboxes.slug, "sent")));

    if (!sentMailbox) return;

    const { sendMailQueue } = await getRedis();

    await sendMailQueue.add("send-and-reconcile", {
        newMessageId: crypto.randomUUID(),
        mode: "forward",
        originalMessageId,
        sentMailboxId: String(sentMailbox.id),
        mailboxId: String(sentMailbox.id),
        to: forwardTo,
        attachments: "[]",
    });
};