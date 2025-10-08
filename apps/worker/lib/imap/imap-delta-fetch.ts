import {db, identities, mailboxes, mailboxSync, messages, threads, threadsList} from "@db";
import {and, eq} from "drizzle-orm";
import {parseAndStoreEmail} from "../message-payload-parser";
import {initSmtpClient} from "./imap-client";
import {ImapFlow} from "imapflow";
import {syncMailbox} from "./imap-sync-mailbox";

export const deltaFetch = async (identityId: string, imapInstances: Map<string, ImapFlow>) => {
    const client = await initSmtpClient(identityId, imapInstances);
    if (!client?.authenticated || !client?.usable) return;

    const [identity] = await db
        .select()
        .from(identities)
        .where(eq(identities.id, identityId));
    const ownerId = identity?.ownerId;
    if (!ownerId) return;

    const mailboxRows = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.identityId, identityId));

    for (const row of mailboxRows) {
        // Only sync when fully idle (not during backfill or uninitialized)
        const [syncRow] = await db
            .select()
            .from(mailboxSync)
            .where(
                and(
                    eq(mailboxSync.identityId, identityId),
                    eq(mailboxSync.mailboxId, row.id),
                ),
            );
        if (!syncRow) continue;
        if (
            syncRow.phase !== "IDLE" ||
            Number(syncRow.backfillCursorUid || 0) > 0
        )
            continue;

        await syncMailbox({
            client,
            identityId: identityId,
            mailboxId: row.id,
            path: String(row?.metaData?.imap.path),
            window: 500,
            onMessage: async (msg, path: string) => {

                console.dir(msg, { depth: 10 });

                const messageId = msg.envelope?.messageId?.trim() || null;
                const uid = msg.uid;
                const raw = (await msg.source?.toString()) || "";

                if (!messageId) {
                    console.warn(`[deltaFetch] Message missing messageId — ${path} UID=${uid}`);
                    return await parseAndStoreEmail(raw, {
                        ownerId,
                        mailboxId: row.id,
                        rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
                        emlKey: String(msg.id),
                        metaData: {
                            imap: {
                                uid: msg.uid,
                                mailboxPath: path
                            }
                        }
                    });
                }

                const [existing] = await db
                    .select({ id: messages.id, mailboxId: messages.mailboxId, threadId: messages.threadId })
                    .from(messages)
                    .where(
                        and(
                            eq(messages.ownerId, ownerId),
                            // eq(messages.mailboxId, row.id),
                            eq(messages.messageId, messageId)
                        )
                    )

                if(existing){
                    if (existing.mailboxId !== row.id) {
                        console.log(`[deltaFetch] Message moved: ${messageId} ${existing.mailboxId} → ${row.id}`);
                        const allMessagesInThread = await db
                            .select()
                            .from(messages)
                            .where(eq(messages.threadId, existing.threadId));

                        // Move all messages in the thread to the new mailbox
                        for (const message of allMessagesInThread) {
                            const updatedMetaData = {
                                ...message.metaData,
                                imap: {
                                    ...(message.metaData?.imap || {}),
                                    mailboxPath: path,
                                },
                            };

                            await db.update(messages)
                                .set({
                                    mailboxId: row.id,
                                    metaData: updatedMetaData
                                })
                                .where(eq(messages.id, message.id)).catch((e) => {
                                    console.error("Failed to update message mailboxId", e);
                                })
                        }

                        await db
                            .update(threads)
                            .set({ mailboxId: row.id })
                            .where(eq(threads.id, existing.threadId)).catch((e) => {
                                console.error("Failed to update threads mailboxId", e);
                            });

                        await db.update(threadsList)
                            .set({
                                mailboxId: row.id,
                                mailboxSlug: row.slug,
                                // lastActivityAt: new Date(),         // optional: keep ordering fresh
                                // updatedAt: new Date(),
                            })
                            .where(eq(threadsList.id, existing.threadId));

                        return
                    }
                }

                // New message
                await parseAndStoreEmail(raw, {
                    ownerId,
                    mailboxId: row.id,
                    rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
                    emlKey: String(msg.id),
                    metaData: {
                        imap: {
                            uid: msg.uid,
                            mailboxPath: path
                        }
                    }
                });

                return undefined as any;

                // const raw = (await msg?.source?.toString()) || "";
                // await parseAndStoreEmail(raw, {
                // 	ownerId,
                // 	mailboxId: row.id,
                // 	rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
                // 	emlKey: String(msg.id),
                //     metaData: {
                //         imap: {
                //             uid: msg.uid,
                //             mailboxPath: path
                //         }
                //     }
                // });
            },
        });
    }
};
