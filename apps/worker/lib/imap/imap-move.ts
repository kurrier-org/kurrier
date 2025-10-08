import {db, mailboxes, messages, threadsList} from "@db";
import {and, eq, sql} from "drizzle-orm";
import {MailboxKind} from "@schema";
import {ImapFlow} from "imapflow";
import {initSmtpClient} from "./imap-client";

export const moveMail = async (data: {threadListId: string, op: string}, imapInstances: Map<string, ImapFlow>) => {
    console.log("data", data)
    const [thread] = await db.select().from(threadsList).where(eq(
        threadsList.id, data.threadListId
    ))
    if (!thread) return;
    const [trashMailbox] = await db.select().from(mailboxes).where(and(
        eq(mailboxes.identityId, thread.identityId),
        eq(mailboxes.kind, data.op as MailboxKind),
    ));
    if (!trashMailbox) {
        console.warn(`[mail:move] No Trash mailbox for identity=${thread.identityId}`);
        return;
    }
    const trashPath: string = (trashMailbox.metaData as any)?.imap?.path || trashMailbox.name;

    console.log("trashPath", trashPath)

    const threadMsgs = await db
        .select({
            id: messages.id,
            meta: messages.metaData,
        })
        .from(messages)
        .where(eq(messages.threadId, data.threadListId));

    // Group by source mailboxPath and gather UIDs
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



    console.log("byPath", byPath);
    console.log("trashPath", trashPath)

    const client: ImapFlow = await initSmtpClient(thread.identityId, imapInstances);
    if (!client?.authenticated || !client.usable) return;

    // for await (const mbx of await client.list()) {
    //     console.log(mbx);
    // }

    try {
        for (const { path: srcPath, uids } of byPath.values()) {
            if (!uids.length) continue;

            // Open source and move to Trash by UIDs
            await client.mailboxOpen(srcPath, { readOnly: false });
            // NOTE: ImapFlow supports array-of-UIDs or sequence string; with {uid:true}
            await client.messageMove(uids, trashPath, { uid: true });
        }
    } catch (err) {
        console.error("[mail:move] IMAP move failed:", err);
        // Do not throw—let delta sync repair if needed.
    } finally {
        // try {
        //     await client.logout();
        // } catch {}
    }

    // 5) Update database to reflect Trash locally
    await db.transaction(async (tx) => {
        // Update messages mailboxes and their meta.imap.mailboxPath
        await tx
            .update(messages)
            .set({
                mailboxId: trashMailbox.id,
                metaData: sql`jsonb_set(coalesce(${messages.metaData}, '{}'::jsonb), '{imap,mailboxPath}', to_jsonb(${trashPath}::text), true)`,
                updatedAt: new Date(),
            })
            .where(eq(messages.threadId, data.threadListId));

        // For the thread row: mark as in "trash"
        await tx
            .update(threadsList)
            .set({
                mailboxId: trashMailbox.id,
                mailboxSlug: "trash",
                updatedAt: new Date(),
            })
            .where(eq(threadsList.id, data.threadListId));
    });


};
