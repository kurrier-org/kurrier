import { defineNitroPlugin } from "nitropack/runtime";
import { db, messages, threadsList } from "@db";
import { fromAddress, fromName, ToSearchDocInput } from "@schema";
import Typesense from "typesense";
import { getServerEnv, messagesSearchSchema } from "@schema";
import { eq } from "drizzle-orm";

const {
    TYPESENSE_API_KEY,
    TYPESENSE_PORT,
    TYPESENSE_PROTOCOL,
    TYPESENSE_HOST,
} = getServerEnv();

const REBUILD_COLLECTION = false;
const BATCH_SIZE = 2000;

const client = new Typesense.Client({
    nodes: [
        {
            host: TYPESENSE_HOST,
            port: Number(TYPESENSE_PORT),
            protocol: TYPESENSE_PROTOCOL,
        },
    ],
    apiKey: TYPESENSE_API_KEY,
});

import type { AddressObjectJSON, EmailAddressJSON } from "@schema";

const uniq = <T>(arr: T[]) => [...new Set(arr)];

function normalizeEmail(e?: string | null): string | null {
    if (!e) return null;
    return String(e).trim().toLowerCase().replace(/[<>\s]+/g, "") || null;
}

function flattenEmails(list?: EmailAddressJSON[]): string[] {
    if (!list?.length) return [];
    const out: string[] = [];
    for (const item of list) {
        if (item.address) out.push(item.address);
        if (item.group?.length) out.push(...flattenEmails(item.group));
    }
    return out;
}

function emailsFromAddressObj(obj?: AddressObjectJSON | null): string[] {
    if (!obj) return [];
    return flattenEmails(obj.value);
}

/** Collects *all* participant email addresses from from/to/cc/bcc (message-level fallback) */
export function collectParticipants(
    from: AddressObjectJSON | null,
    to: AddressObjectJSON | null,
    cc: AddressObjectJSON | null,
    bcc: AddressObjectJSON | null,
): string[] {
    const candidates = [
        ...emailsFromAddressObj(from),
        ...emailsFromAddressObj(to),
        ...emailsFromAddressObj(cc),
        ...emailsFromAddressObj(bcc),
    ]
        .map(normalizeEmail)
        .filter((x): x is string => Boolean(x));
    return uniq(candidates);
}

export function emailDomain(email?: string | null) {
    if (!email) return "";
    const m = String(email).toLowerCase().match(/@([^> ]+)/);
    return m?.[1] ?? "";
}

/**
 * Note: we accept optional thread-level hints (preview, last activity, participants)
 * and use them to populate existing fields (snippet, lastInThreadAt, participants).
 * No new Typesense fields are introduced.
 */
function toSearchDoc(
    msg: ToSearchDocInput & {
        threadPreview?: string | null;
        threadLastActivityAt?: Date | string | null;
        threadParticipants?: {
            from?: { n?: string | null; e: string }[];
            to?: { n?: string | null; e: string }[];
            cc?: { n?: string | null; e: string }[];
            bcc?: { n?: string | null; e: string }[];
        } | null;
    },
) {
    // Prefer thread participants if present; else derive from message
    const participantsFromThread =
        msg.threadParticipants
            ? uniq(
                [
                    ...(msg.threadParticipants.from ?? []).map((x) => normalizeEmail(x.e)),
                    ...(msg.threadParticipants.to ?? []).map((x) => normalizeEmail(x.e)),
                    ...(msg.threadParticipants.cc ?? []).map((x) => normalizeEmail(x.e)),
                    ...(msg.threadParticipants.bcc ?? []).map((x) => normalizeEmail(x.e)),
                ].filter(Boolean) as string[],
            )
            : null;

    const participants =
        participantsFromThread?.length
            ? participantsFromThread
            : collectParticipants(msg.from ?? null, msg.to ?? null, msg.cc ?? null, msg.bcc ?? null);

    const fromEmail = (msg.fromEmail ?? "").toLowerCase();

    const createdAtMs = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();

    // Prefer thread last activity if available
    const lastInThreadAtMs = msg.threadLastActivityAt
        ? new Date(msg.threadLastActivityAt).getTime()
        : (msg.lastInThreadAt ? new Date(msg.lastInThreadAt).getTime() : createdAtMs);

    // Prefer thread preview for the snippet, fallback to message text
    const snippet =
        (msg.threadPreview ?? "").trim() ||
        (msg.text ?? "").slice(0, 200);

    return {
        id: msg.id,
        ownerId: msg.ownerId,
        mailboxId: msg.mailboxId,
        threadId: msg.threadId,

        subject: msg.subject ?? "",
        snippet,
        text: msg.text ?? "",
        html: msg.html ?? "",

        fromName: msg.fromName ?? "",
        fromEmail,
        fromDomain: emailDomain(fromEmail),

        participants, // string[]
        labels: (msg.labels ?? []).map((l) => l.toLowerCase()),

        hasAttachment: msg.hasAttachments ? 1 : 0,
        unread: msg.seen ? 0 : 1,

        sizeBytes: Number(msg.sizeBytes ?? 0),

        createdAt: createdAtMs,
        lastInThreadAt: lastInThreadAtMs,
    };
}

export default defineNitroPlugin(async () => {
    console.log("[typesense] boot");

    if (REBUILD_COLLECTION) {
        try {
            await client.collections("messages").delete();
        } catch {}
        await client.collections().create(messagesSearchSchema);
        console.log("[typesense] created collection messages");
    } else {
        try {
            await client.collections("messages").retrieve();
        } catch {
            await client.collections().create(messagesSearchSchema);
            console.log("[typesense] created collection messages");
        }
    }

    let offset = 0;
    let imported = 0;

    while (true) {
        // JOIN thread-level context
        const batch = await db
            .select({
                m: messages,
                tl_subject: threadsList.subject,
                tl_preview: threadsList.previewText,
                tl_lastActivityAt: threadsList.lastActivityAt,
                tl_messageCount: threadsList.messageCount,
                tl_unreadCount: threadsList.unreadCount,
                tl_hasAttachments: threadsList.hasAttachments,
                tl_participants: threadsList.participants,
            })
            .from(messages)
            .leftJoin(threadsList, eq(messages.threadId, threadsList.id))
            .limit(BATCH_SIZE)
            .offset(offset);

        if (batch.length === 0) break;

        const docs = batch.map((row) => {
            const m = row.m;

            return toSearchDoc({
                id: m.id,
                ownerId: m.ownerId,
                mailboxId: m.mailboxId,
                threadId: m.threadId,

                // keep message subject (threads_list.subject is already used to build preview/snippet—if you want,
                // you can also prefer tl_subject here)
                subject: m.subject ?? row.tl_subject ?? "",

                text: m.text,
                html: m.html,

                fromName: fromName(m),
                fromEmail: fromAddress(m),

                from: m.from,
                to: m.to,
                cc: m.cc,
                bcc: m.bcc,

                hasAttachments: m.hasAttachments || !!row.tl_hasAttachments,
                seen: m.seen,
                sizeBytes: m.sizeBytes,

                createdAt: m.date,
                lastInThreadAt: m.date, // will be overridden by threadLastActivityAt below, if present

                // thread-level hints (used to compute existing fields)
                threadPreview: row.tl_preview ?? null,
                threadLastActivityAt: row.tl_lastActivityAt ?? null,
                threadParticipants: (row.tl_participants as any) ?? null,

                labels: [],
            });
        });

        const result = await client
            .collections("messages")
            .documents()
            .import(docs, { action: "upsert" });

        const failed = result.filter((r: any) => r.success !== true);
        if (failed.length) console.warn("[typesense] some docs failed", failed.slice(0, 5));

        imported += docs.length;
        offset += BATCH_SIZE;
        console.log(`[typesense] upserted ${imported}`);
    }

    console.log("[typesense] indexing done");
});
