// @ts-nocheck
import {
    db,
    identities,
    mailboxes,
    MessageEntity,
    messages,
    threadsList,
    ThreadsListInsertSchema
} from "@db";
import {and, desc, eq, sql} from "drizzle-orm";
import {AddressObjectJSON} from "@schema";
import {PgTransaction} from "drizzle-orm/pg-core";

type Mini = { n?: string | null; e: string | null };
export const generateSnippet = (text: string) => {
    if (!text) return null;
    return text.toString()
        .replace(/\s+/g, " ")
        .slice(0, 100)
};


export function buildParticipantsSnapshot(msg: MessageEntity) {
    const extract = (addrObj?: AddressObjectJSON | null) =>
        (addrObj?.value ?? [])
            .map((a) => ({
                n: a?.name || null,
                e: a?.address || null,
            }))
            .filter((x) => x.e)
            .slice(0, 5);

    return {
        from: extract(msg.from),
        to: extract(msg.to),
        cc: extract(msg.cc),
        bcc: extract(msg.bcc),
    };
}


export async function upsertThreadsListItem(messageId: string, tx?: PgTransaction) {

    const txDb = tx || db;
    const [msg] = await txDb
        .select()
        .from(messages)
        .where(eq(messages.id, messageId));

    if (!msg) throw new Error(`Message ${messageId} not found`);

    const [mailbox] = await txDb
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.id, msg.mailboxId));

    const [identity] = await txDb
        .select()
        .from(identities)
        .where(eq(identities.id, mailbox.identityId));

    if (!mailbox) throw new Error(`Mailbox ${msg.mailboxId} not found`);

    const subject = msg.subject?.trim() || "(no subject)";
    const previewText = msg.snippet
    const lastActivityAt = msg.date ?? msg.createdAt;

    const allMessagesInThread = await txDb
        .select({
            id: messages.id,
            subject: messages.subject,
            text: messages.text,
            html: messages.html,
            seen: messages.seen,
            hasAttachments: messages.hasAttachments,
            from: messages.from,
            to: messages.to,
            cc: messages.cc,
            bcc: messages.bcc,
            date: messages.date,
            createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(eq(messages.ownerId, msg.ownerId), eq(messages.threadId, msg.threadId)))
        .orderBy(desc(sql`coalesce(${messages.date}, ${messages.createdAt})`));


    const participants: {
        from: Mini[]; to: Mini[]; cc: Mini[]; bcc: Mini[];
    } = { from: [], to: [], cc: [], bcc: [] };

    const seen = {
        from: new Set<string>(),
        to:   new Set<string>(),
        cc:   new Set<string>(),
        bcc:  new Set<string>(),
    };

    for (const row of allMessagesInThread) {
        const snap = buildParticipantsSnapshot(row as MessageEntity);

        (["from","to","cc","bcc"] as const).forEach((k) => {
            if (participants[k].length >= 5) return;
            for (const p of snap[k]) {
                const email = (p.e || "").toLowerCase();
                if (!email || seen[k].has(email)) continue;
                seen[k].add(email);
                participants[k].push({ n: p.n ?? null, e: p.e ?? null });
                if (participants[k].length >= 5) break;
            }
        });

        // Early exit if all buckets filled
        if (
            participants.from.length >= 5 &&
            participants.to.length   >= 5 &&
            participants.cc.length   >= 5 &&
            participants.bcc.length  >= 5
        ) break;
    }



    const parsedPayload = ThreadsListInsertSchema.parse({
        id: msg.threadId,
        ownerId: mailbox.ownerId,
        identityId: mailbox.identityId,
        mailboxId: mailbox.id,
        identityPublicId: identity.publicId,
        mailboxSlug: mailbox.slug,
        subject,
        previewText,
        lastActivityAt,
        firstMessageAt: lastActivityAt,
        messageCount: 1,
        unreadCount: msg.seen ? 0 : 1,
        hasAttachments: msg.hasAttachments,
        participants,
    });

    await txDb
        .insert(threadsList)
        .values(parsedPayload)
        .onConflictDoUpdate({
            target: threadsList.id,
            set: {
                subject: sql`COALESCE(EXCLUDED.subject, ${threadsList.subject})`,
                previewText: sql`COALESCE(EXCLUDED.preview_text, ${threadsList.previewText})`,
                lastActivityAt: sql`GREATEST(EXCLUDED.last_activity_at, ${threadsList.lastActivityAt})`,
                messageCount: sql`${threadsList.messageCount} + 1`,
                unreadCount: sql`${threadsList.unreadCount} + ${msg.seen ? 0 : 1}`,
                hasAttachments: sql`${threadsList.hasAttachments} OR ${msg.hasAttachments}`,
                participants: sql`jsonb_strip_nulls(${threadsList.participants} || EXCLUDED.participants)`,
                updatedAt: sql`now()`,
            },
        });

    return { threadId: msg.threadId, mailboxId: mailbox.id };
}
