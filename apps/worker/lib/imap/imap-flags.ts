import {db, messages, threadsList} from "@db";
import {desc, eq, sql} from "drizzle-orm";
import {initSmtpClient} from "./imap-client";
import {ImapFlow} from "imapflow";

export async function mailSetFlags(data: {threadListId: string, op: string}, imapInstances: Map<string, ImapFlow>) {
    const [thread] = await db.select().from(threadsList).where(eq(
        threadsList.id, data.threadListId
    ))
    if (!thread) return;

    const client = await initSmtpClient(thread.identityId, imapInstances);
    if (!client?.authenticated || !client?.usable) return;
    const threadMessages = await db.select()
        .from(messages)
        .where(eq(messages.threadId, thread.id))
        .orderBy(desc(sql`coalesce(${messages.date}, ${messages.createdAt})`))

    const newest = threadMessages[0];
    if (!newest) return;





    const opToAction = (op: string):
        | { fn: "add" | "del"; flag: "\\Seen" | "\\Flagged" | "\\Answered" }
        | null => {
        switch (op) {
            case "read":
                return { fn: "add", flag: "\\Seen" };
            case "unread":
                return { fn: "del", flag: "\\Seen" };
            case "flag":
                return { fn: "add", flag: "\\Flagged" };
            case "unflag":
                return { fn: "del", flag: "\\Flagged" };
            case "answered":
                return { fn: "add", flag: "\\Answered" };
            case "unanswered":
                return { fn: "del", flag: "\\Answered" };
            default:
                return null;
        }
    };



    const isFlagging = data.op === "flag";
    const isUnflagging = data.op === "unflag";

    if (isFlagging || isUnflagging) {

        const imap = (newest.metaData as any)?.imap ?? {};
        const uid = Number(imap.uid);
        const mailboxPath: string | undefined = imap.mailboxPath;


        if (uid && mailboxPath) {
            try {
                const lock = await client.getMailboxLock(mailboxPath);
                try {
                    if (isFlagging) {
                        await client.messageFlagsAdd([uid], ["\\Flagged"], { uid: true });
                    } else {
                        await client.messageFlagsRemove([uid], ["\\Flagged"], { uid: true });
                    }
                } finally {
                    lock.release();
                }
            } catch (err) {
                console.error(`[mail:set-flags] toggle \\Flagged mailbox=${mailboxPath} uid=${uid}`, err);
                // continue to DB update so UI stays consistent even if IMAP failed
            }
            // try {
            //     await client.mailboxOpen(mailboxPath, { readOnly: false });
            //     if (isFlagging) {
            //         await client.messageFlagsAdd([uid], ['\\Flagged'], { uid: true });
            //     } else {
            //         await client.messageFlagsRemove([uid], ['\\Flagged'], { uid: true });
            //     }
            // } catch (err) {
            //     console.error(`[mail:set-flags] toggle \\Flagged mailbox=${mailboxPath} uid=${uid}`, err);
            //     // continue to DB update so UI stays consistent even if IMAP failed
            // }
        }

        await db.transaction(async (tx) => {
            await tx
                .update(messages)
                .set({ flagged: isFlagging })
                .where(eq(messages.id, newest.id));

            const [agg] = await tx.select({
                anyOtherFlagged: sql<boolean>`exists(
                  select 1 from ${messages}
                  where ${messages.threadId} = ${thread.id}
                    and ${messages.flagged} = true
                    and ${messages.id} <> ${newest.id}
                )`,
            }).from(messages).limit(1);

            const starred = isFlagging || agg.anyOtherFlagged;

            await tx.update(threadsList)
                .set({ starred, updatedAt: new Date() })
                .where(eq(threadsList.id, thread.id));
        });

        return
    }

    const byMailbox = new Map<
        string,
        Array<{ id: string; uid: number }>
    >();

    for (const m of threadMessages) {
        const imap = (m.metaData as any)?.imap;
        const uid = Number(imap?.uid);
        const mailboxPath = imap?.mailboxPath as string | undefined;

        if (!uid || !mailboxPath) continue;

        if (!byMailbox.has(mailboxPath)) byMailbox.set(mailboxPath, []);
        byMailbox.get(mailboxPath)!.push({ id: m.id, uid });
    }



    const action = opToAction(data.op);
    if (!action) return;

    for (const [mailboxPath, list] of byMailbox.entries()) {
        try {

            const lock = await client.getMailboxLock(mailboxPath);
            try {
                const uids: number[] = list.map((x) => x.uid).sort((a, b) => a - b);

                if (uids.length === 0) continue;

                if (action.fn === "add") {
                    await client.messageFlagsAdd(uids, [action.flag], { uid: true });
                } else {
                    await client.messageFlagsRemove(uids, [action.flag], { uid: true });
                }
            } finally {
                lock.release();
            }

            // await client.mailboxOpen(mailboxPath, { readOnly: false });


            // const uids: number[] = list.map((x) => x.uid).sort((a, b) => a - b);
            //
            // if (uids.length === 0) continue;
            //
            // if (action.fn === "add") {
            //     await client.messageFlagsAdd(uids, [action.flag], { uid: true });
            // } else {
            //     await client.messageFlagsRemove(uids, [action.flag], { uid: true });
            // }
        } catch (err) {
            // Log & continue — don't fail the whole job for a single mailbox
            console.error(`[mail:set-flags] mailbox=${mailboxPath} error`, err);
        }
    }



}
