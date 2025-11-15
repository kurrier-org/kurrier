import {db, mailboxes, MessageEntity, webhooks} from "@db";
import {and, eq, isNull, or, sql} from "drizzle-orm";

export const processWebhook = async ({message, rawEmail}: { message: MessageEntity, rawEmail: string }) => {

    const [mailbox] =  await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.id, message.mailboxId))


    if (!mailbox) return;

    const hooks = await db
        .select()
        .from(webhooks)
        .where(
            and(
                or(
                    eq(webhooks.identityId, mailbox.identityId),
                    isNull(webhooks.identityId)
                ),
                sql`${webhooks.events} @> '{message.received}'::webhook_list[]`,
                eq(webhooks.enabled, true)
            )
        );

    for (const hook of hooks) {
        try {
            await fetch(hook.url, {
                method: "POST",
                body: JSON.stringify({
                    event: "message.received",
                    data: {
                        message,
                        rawEmail,
                    },
                }),
            });
        } catch (err) {
            console.error(
                `Error sending webhook to ${hook.url}: `,
                (err as Error).message,
            );
        }
    }

};
