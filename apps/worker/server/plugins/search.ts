import { defineNitroPlugin } from "nitropack/runtime";
import { db, messages, mailboxThreads } from "@db"; // ✅ replaced threadsList
import { ToSearchDocInput } from "@schema";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import Typesense from "typesense";
import { getServerEnv, messagesSearchSchema } from "@schema";
import { eq } from "drizzle-orm";
import type { AddressObjectJSON, EmailAddressJSON } from "@schema";

const {
    TYPESENSE_API_KEY,
    TYPESENSE_PORT,
    TYPESENSE_PROTOCOL,
    TYPESENSE_HOST,
} = getServerEnv();

const REBUILD_COLLECTION = true;
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

export function collectParticipants(
    from: AddressObjectJSON | null,
    to: AddressObjectJSON | null,
    cc: AddressObjectJSON | null,
    bcc: AddressObjectJSON | null
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
        threadStarred?: boolean | null;
    }
) {
    const participantsFromThread =
        msg.threadParticipants
            ? uniq(
                [
                    ...(msg.threadParticipants.from ?? []).map((x) => normalizeEmail(x.e)),
                    ...(msg.threadParticipants.to ?? []).map((x) => normalizeEmail(x.e)),
                    ...(msg.threadParticipants.cc ?? []).map((x) => normalizeEmail(x.e)),
                    ...(msg.threadParticipants.bcc ?? []).map((x) => normalizeEmail(x.e)),
                ].filter(Boolean) as string[]
            )
            : null;

    const participants =
        participantsFromThread?.length
            ? participantsFromThread
            : collectParticipants(msg.from ?? null, msg.to ?? null, msg.cc ?? null, msg.bcc ?? null);

    const fromEmail = (msg.fromEmail ?? "").toLowerCase();
    const createdAtMs = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
    const lastInThreadAtMs = msg.threadLastActivityAt
        ? new Date(msg.threadLastActivityAt).getTime()
        : msg.lastInThreadAt
            ? new Date(msg.lastInThreadAt).getTime()
            : createdAtMs;

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

        participants,
        labels: (msg.labels ?? []).map((l) => l.toLowerCase()),

        hasAttachment: msg.hasAttachments ? 1 : 0,
        unread: msg.seen ? 0 : 1,

        sizeBytes: Number(msg.sizeBytes ?? 0),

        starred: (msg.threadStarred ? 1 : 0),

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
        const batch = await db
            .select({
                m: messages,
                mt_subject: mailboxThreads.subject,
                mt_preview: mailboxThreads.previewText,
                mt_lastActivityAt: mailboxThreads.lastActivityAt,
                mt_messageCount: mailboxThreads.messageCount,
                mt_unreadCount: mailboxThreads.unreadCount,
                mt_hasAttachments: mailboxThreads.hasAttachments,
                mt_participants: mailboxThreads.participants,
                mt_starred: mailboxThreads.starred,
            })
            .from(messages)
            .leftJoin(mailboxThreads, eq(messages.threadId, mailboxThreads.threadId))
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

                subject: m.subject ?? row.mt_subject ?? "",
                text: m.text,
                html: m.html,

                fromName: getMessageName(m, "from"),
                fromEmail: getMessageAddress(m, "from"),

                from: m.from,
                to: m.to,
                cc: m.cc,
                bcc: m.bcc,

                hasAttachments: m.hasAttachments || !!row.mt_hasAttachments,
                seen: m.seen,
                sizeBytes: m.sizeBytes,

                createdAt: m.date,
                lastInThreadAt: m.date,

                threadPreview: row.mt_preview ?? null,
                threadLastActivityAt: row.mt_lastActivityAt ?? null,
                threadParticipants: (row.mt_participants as any) ?? null,
                threadStarred: !!row.mt_starred,

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
