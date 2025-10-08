import { db, mailboxes, messages, mailboxThreads } from "@db";
import { and, eq, sql } from "drizzle-orm";
import { MailboxKind } from "@schema";
import { ImapFlow } from "imapflow";
import { initSmtpClient } from "./imap-client";

export const moveMail = async (
    data: { threadId: string; mailboxId: string; op: string },
    imapInstances: Map<string, ImapFlow>
) => {
    const { threadId, mailboxId, op } = data;

    // 1️⃣ Find source mailbox and owning identity
    const [srcMailbox] = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.id, mailboxId));
    if (!srcMailbox) return;

    // 2️⃣ Find destination mailbox (e.g., "trash")
    const [destMailbox] = await db
        .select()
        .from(mailboxes)
        .where(
            and(
                eq(mailboxes.identityId, srcMailbox.identityId),
                eq(mailboxes.kind, op as MailboxKind)
            )
        );

    if (!destMailbox) {
        console.warn(`[mail:move] No ${op} mailbox for identity=${srcMailbox.identityId}`);
        return;
    }

    const destPath: string =
        (destMailbox.metaData as any)?.imap?.path || destMailbox.name;

    // 3️⃣ Get all messages for this thread + mailbox
    const threadMsgs = await db
        .select({
            id: messages.id,
            meta: messages.metaData,
        })
        .from(messages)
        .where(and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)));

    if (threadMsgs.length === 0) return;

    // 4️⃣ Group messages by mailboxPath and gather UIDs
    type Group = { path: string; uids: number[]; messageIds: string[] };
    const byPath = new Map<string, Group>();

    for (const m of threadMsgs) {
        const imap = (m.meta as any)?.imap;
        const uid = imap?.uid;
        const srcPath = imap?.mailboxPath as string | undefined;

        if (!uid || !srcPath) continue; // skip non-IMAP or unsynced messages

        const g = byPath.get(srcPath) ?? { path: srcPath, uids: [], messageIds: [] };
        g.uids.push(Number(uid));
        g.messageIds.push(m.id);
        byPath.set(srcPath, g);
    }

    if (byPath.size === 0) return;

    // 5️⃣ Connect to IMAP for this identity
    const client: ImapFlow = await initSmtpClient(srcMailbox.identityId, imapInstances);
    if (!client?.authenticated || !client.usable) return;

    // 6️⃣ Perform IMAP move per source folder
    try {
        for (const { path: srcPath, uids } of byPath.values()) {
            if (!uids.length) continue;

            const lock = await client.getMailboxLock(srcPath);
            try {
                await client.messageMove(uids, destPath, { uid: true });
            } finally {
                lock.release();
            }
        }
    } catch (err) {
        console.error("[mail:move] IMAP move failed:", err);
        // allow delta sync to fix if needed
    }

    // 7️⃣ Update local DB: mark moved messages + mailboxThreads
    await db.transaction(async (tx) => {
        await tx
            .update(messages)
            .set({
                mailboxId: destMailbox.id,
                metaData: sql`jsonb_set(coalesce(${messages.metaData}, '{}'::jsonb), '{imap,mailboxPath}', to_jsonb(${destPath}::text), true)`,
                updatedAt: new Date(),
            })
            .where(and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)));

        await tx
            .update(mailboxThreads)
            .set({
                mailboxId: destMailbox.id,
                mailboxSlug: op,
                updatedAt: new Date(),
            })
            .where(and(eq(mailboxThreads.threadId, threadId), eq(mailboxThreads.mailboxId, mailboxId)));
    });
};
