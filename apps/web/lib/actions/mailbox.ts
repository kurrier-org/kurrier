"use server";

import { cache } from "react";
import { rlsClient } from "@/lib/actions/clients";
import {
    identities,
    mailboxes, mailboxThreads,
    messageAttachments,
    messages,
    threads,
} from "@db";
import {and, asc, count, desc, eq, inArray, sql} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
    FormState,
    getServerEnv,
    SearchThreadsResponse
} from "@schema";
import { decode } from "decode-formdata";
import { toArray } from "@/lib/utils";
import { Queue, QueueEvents } from "bullmq";

const getRedis = async () => {
    const { REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = getServerEnv();

    const redisConnection = {
        connection: {
            host: REDIS_HOST || "redis",
            port: Number(REDIS_PORT || 6379),
            password: REDIS_PASSWORD,
        },
    };
    const smtpQueue = new Queue("smtp-worker", redisConnection);
    const smtpEvents = new QueueEvents("smtp-worker", redisConnection);

    const sendMailQueue = new Queue("send-mail", redisConnection);
    const sendMailEvents = new QueueEvents("send-mail", redisConnection);

    const searchIngestQueue = new Queue("search-ingest", redisConnection);
    const searchIngestEvents = new QueueEvents("search-ingest", redisConnection);

    await smtpEvents.waitUntilReady();
    await sendMailEvents.waitUntilReady();
    await searchIngestEvents.waitUntilReady();
    return {
        smtpQueue,
        smtpEvents,
        sendMailQueue,
        sendMailEvents,
        searchIngestQueue,
        searchIngestEvents
    };
};

import Typesense, { Client } from "typesense";
let typeSenseClient: Client | null = null;
function getTypeSenseClient(): Client {
    if (typeSenseClient) return typeSenseClient;

    const {
        TYPESENSE_API_KEY,
        TYPESENSE_PORT,
        TYPESENSE_PROTOCOL,
        TYPESENSE_HOST,
    } = getServerEnv();

    typeSenseClient = new Typesense.Client({
        nodes: [
            {
                host: TYPESENSE_HOST,
                port: Number(TYPESENSE_PORT),
                protocol: TYPESENSE_PROTOCOL,
            },
        ],
        apiKey: TYPESENSE_API_KEY,
    });

    return typeSenseClient;
}

export const fetchMailbox = cache(
    async (identityPublicId: string, mailboxSlug = "inbox") => {
        const rls = await rlsClient();
        const [identity] = await rls((tx) =>
            tx
                .select()
                .from(identities)
                .where(eq(identities.publicId, identityPublicId)),
        );
        const [activeMailbox] = await rls((tx) =>
            tx
                .select()
                .from(mailboxes)
                .where(
                    and(
                        eq(mailboxes.identityId, identity.id),
                        eq(mailboxes.slug, mailboxSlug),
                    ),
                ),
        );
        const mailboxList = await rls((tx) =>
            tx.select().from(mailboxes).where(eq(mailboxes.identityId, identity.id)),
        );
        const [messagesCount] = await rls((tx) =>
            tx
                .select({ count: count() })
                .from(messages)
                .where(eq(messages.mailboxId, activeMailbox.id)),
        );

        return {
            activeMailbox,
            mailboxList,
            identity,
            count: Number(messagesCount.count),
        };
    },
);




export const fetchMessageAttachments = cache(async (messageId: string) => {
    const rls = await rlsClient();
    const attachmentsList = await rls((tx) =>
        tx
            .select()
            .from(messageAttachments)
            .where(eq(messageAttachments.messageId, messageId))
            .orderBy(desc(messageAttachments.createdAt)),
    );
    return { attachments: attachmentsList };
});

export const revalidateMailbox = async (path: string) => {
    revalidatePath(path);
};


export async function sendMail(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    const decodedForm = decode(formData);

    if (toArray(decodedForm.to as any).length === 0) {
        return { error: "Please provide at least one recipient in the To field." };
    }
    const { sendMailQueue, sendMailEvents } = await getRedis();
    const job = await sendMailQueue.add("send-and-reconcile", decodedForm);
    const result = await job.waitUntilFinished(sendMailEvents);
    return result
}

export const deltaFetch = async ({ identityId }: { identityId: string }) => {
    const { smtpQueue, smtpEvents } = await getRedis();
    const job = await smtpQueue.add("delta-fetch", { identityId });
    await job.waitUntilFinished(smtpEvents);
};


export const initSearch = async (
    query: string,
    ownerId: string,
    hasAttachment: boolean,
    onlyUnread: boolean,
    starred: boolean,        // NEW
    page: number,
): Promise<SearchThreadsResponse> => {
    const client = getTypeSenseClient();

    const filters = [`ownerId:=${JSON.stringify(ownerId)}`];
    if (hasAttachment) filters.push("hasAttachment:=1");
    if (onlyUnread)   filters.push("unread:=1");
    if (starred)      filters.push("starred:=1");     // NEW

    const result = (await client
        .collections("messages")
        .documents()
        .search({
            q: query,
            query_by: "subject,html,text,fromName,fromEmail,participants",
            filter_by: filters.join(" && "),
            sort_by: "createdAt:desc",
            group_by: "threadId",
            group_limit: 1,
            per_page: 50,
            page,
        })) as any;

    const groups = result?.grouped_hits as
        | Array<{ group_key: string[]; hits: Array<{ document: any }> }>
        | undefined;

    const sourceHits = groups?.length
        ? groups.map((g) => g.hits[0]?.document ?? {})
        : (result?.hits ?? []).map((h: any) => h.document ?? {});

    return {
        items: sourceHits.map((d: any) => ({
            id: d.id ?? "",
            threadId: d.threadId ?? "",
            subject: d.subject ?? null,
            snippet: (d.snippet ?? d.text ?? "").slice(0, 200),
            fromName: d.fromName ?? null,
            fromEmail: d.fromEmail ?? null,
            participants: Array.isArray(d.participants) ? d.participants : [],
            labels: Array.isArray(d.labels) ? d.labels : [],
            hasAttachment: Number(d.hasAttachment) === 1,
            unread: Number(d.unread) === 1,
            starred: Number(d.starred) === 1,           // NEW (if you want to use it in UI)
            createdAt: d.createdAt ?? 0,
            lastInThreadAt: d.lastInThreadAt ?? d.createdAt ?? 0,
        })),
        totalThreads: result?.found ?? sourceHits.length,
        totalMessages: result?.found_docs ?? sourceHits.length,
    };
};

export const backfillAccount = async (identityId: string) => {
    const { smtpQueue, smtpEvents } = await getRedis();
    const job = await smtpQueue.add(
        "backfill",
        { identityId },
        {
            jobId: `backfill-${identityId}`,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        },
    );
    // await job.waitUntilFinished(smtpEvents);
};



export const fetchWebMailThreadDetail = cache(
    async (
        threadId: string
    ) => {
        const rls = await rlsClient();
        const result = await rls(async (tx) => {
            const rows = await tx
                .select({
                    thread: threads,
                    message: messages,
                })
                .from(threads)
                .innerJoin(messages, eq(messages.threadId, threads.id))
                .where(eq(threads.id, threadId))
                .orderBy(asc(sql`coalesce(${messages.date}, ${messages.createdAt})`));


            if (rows.length === 0) {
                return { thread: null, messages: [] as typeof rows[number]["message"][] };
            }

            const thread = rows[0].thread;
            const msgs = rows.map((r) => r.message);
            return { thread, messages: msgs };
        });
        return result

    },
);



export const markAsRead = cache(
    async (
        threadIds: string | string[],
        mailboxId: string,
        refresh = true
    ) => {
        const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
            .map(String)
            .filter(Boolean);

        if (!ids.length || !mailboxId) return;

        const now = new Date();
        const rls = await rlsClient();

        // 1) DB updates (one trip)
        await rls(async (tx) => {
            // Mark all messages in THESE threads (for THIS mailbox) as seen
            await tx
                .update(messages)
                .set({ seen: true, updatedAt: now })
                .where(and(inArray(messages.threadId, ids), eq(messages.mailboxId, mailboxId)));

            // Set unreadCount -> 0 for each mailboxThreads row
            await tx
                .update(mailboxThreads)
                .set({ unreadCount: 0, updatedAt: now })
                .where(and(inArray(mailboxThreads.threadId, ids), eq(mailboxThreads.mailboxId, mailboxId)));
        });

        // 2) UI refresh (once)
        if (refresh) {
            revalidatePath("/mail");
        }

        // 3) Side effects: IMAP flags + search refresh (per-thread)
        const { smtpQueue, searchIngestQueue } = await getRedis();

        await Promise.all(
            ids.map((threadId) =>
                smtpQueue.add(
                    "mail:set-flags",
                    { threadId, mailboxId, op: "read" },
                    {
                        attempts: 3,
                        backoff: { type: "exponential", delay: 1500 },
                        removeOnComplete: true,
                        removeOnFail: false,
                    }
                )
            )
        );

        await Promise.all(
            ids.map((threadId) =>
                searchIngestQueue.add(
                    "refresh-thread",
                    { threadId },
                    {
                        jobId: `refresh-${threadId}`, // collapse dupes
                        removeOnComplete: true,
                        removeOnFail: false,
                        attempts: 3,
                        backoff: { type: "exponential", delay: 1500 },
                    }
                )
            )
        );
    }
);


// export const markAsRead = cache(
//     async (threadId: string, mailboxId: string, refresh = true) => {
//         if (!threadId || !mailboxId) return;
//
//         const rls = await rlsClient();
//
//         await rls(async (tx) => {
//             // mark all messages in THIS mailbox for this thread as seen
//             await tx
//                 .update(messages)
//                 .set({ seen: true, updatedAt: new Date() })
//                 .where(and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)));
//
//             // set unreadCount → 0 in the per-mailbox projection row
//             await tx
//                 .update(mailboxThreads) // <— use your new table
//                 .set({ unreadCount: 0, updatedAt: new Date() })
//                 .where(and(eq(mailboxThreads.threadId, threadId), eq(mailboxThreads.mailboxId, mailboxId)));
//         });
//
//         if (refresh) {
//             revalidatePath("/mail");
//         }
//
//         const { smtpQueue, searchIngestQueue } = await getRedis();
//         await smtpQueue.add(
//             "mail:set-flags",
//             {
//                 threadId,
//                 mailboxId,
//                 op: "read",
//             },
//             {
//                 attempts: 3,
//                 backoff: { type: "exponential", delay: 1500 },
//                 removeOnComplete: true,
//                 removeOnFail: false,
//             }
//         );
//
//         await searchIngestQueue.add("refresh-thread", { threadId: threadId }, {
//             jobId: `refresh-${threadId}`,    // collapses duplicates
//             removeOnComplete: true,
//             removeOnFail: false,
//             attempts: 3,
//             backoff: { type: "exponential", delay: 1500 },
//         });
//     }
// );


// export const markAsUnread = cache(
//     async (threadId: string, mailboxId: string) => {
//         if (!threadId || !mailboxId) return;
//
//         const rls = await rlsClient();
//
//         await rls(async (tx) => {
//             // 1️⃣ Mark only messages in this mailbox as unread
//             await tx
//                 .update(messages)
//                 .set({ seen: false, updatedAt: new Date() })
//                 .where(and(eq(messages.threadId, threadId), eq(messages.mailboxId, mailboxId)));
//
//             // 2️⃣ Recalculate unread count for this mailbox/thread combo
//             const [{ count }] = await tx
//                 .select({ count: sql<number>`count(*)` })
//                 .from(messages)
//                 .where(
//                     and(
//                         eq(messages.threadId, threadId),
//                         eq(messages.mailboxId, mailboxId),
//                         eq(messages.seen, false)
//                     )
//                 );
//
//             await tx
//                 .update(mailboxThreads)
//                 .set({
//                     unreadCount: count ?? 1, // fallback to 1 if uncertain
//                     updatedAt: new Date(),
//                 })
//                 .where(and(eq(mailboxThreads.threadId, threadId), eq(mailboxThreads.mailboxId, mailboxId)));
//         });
//
//         // 3️⃣ Queue IMAP flag update job
//         const { smtpQueue, searchIngestQueue } = await getRedis();
//         await smtpQueue.add(
//             "mail:set-flags",
//             {
//                 threadId,
//                 mailboxId,
//                 op: "unread",
//             },
//             {
//                 attempts: 3,
//                 backoff: { type: "exponential", delay: 1500 },
//                 removeOnComplete: true,
//                 removeOnFail: false,
//             }
//         );
//
//         await searchIngestQueue.add("refresh-thread", { threadId: threadId }, {
//             jobId: `refresh-${threadId}`,    // collapses duplicates
//             removeOnComplete: true,
//             removeOnFail: false,
//             attempts: 3,
//             backoff: { type: "exponential", delay: 1500 },
//         });
//
//         // 4️⃣ Trigger UI refresh
//         revalidatePath("/mail");
//     }
// );


export const markAsUnread = cache(
    async (threadIds: string | string[], mailboxId: string, refresh: boolean) => {
        const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
            .map(String)
            .filter(Boolean);

        if (!ids.length || !mailboxId) return;

        const now = new Date();
        const rls = await rlsClient();

        await rls(async (tx) => {
            // 1) Flip seen=false for all messages in THESE threads for THIS mailbox
            await tx
                .update(messages)
                .set({ seen: false, updatedAt: now })
                .where(and(inArray(messages.threadId, ids), eq(messages.mailboxId, mailboxId)));

            // 2) Recompute unread counts per thread (grouped)
            const grouped = await tx
                .select({
                    threadId: messages.threadId,
                    count: sql<number>`count(*)`,
                })
                .from(messages)
                .where(
                    and(
                        inArray(messages.threadId, ids),
                        eq(messages.mailboxId, mailboxId),
                        eq(messages.seen, false)
                    )
                )
                .groupBy(messages.threadId);

            const countMap = new Map<string, number>();
            for (const g of grouped) countMap.set(String(g.threadId), Number(g.count));

            // 3) Update mailboxThreads per thread with recomputed unreadCount
            for (const tid of ids) {
                const unread = countMap.get(tid);
                await tx
                    .update(mailboxThreads)
                    .set({
                        unreadCount: unread ?? 1, // fallback to 1 so it surfaces in UI if uncertain
                        updatedAt: now,
                    })
                    .where(and(eq(mailboxThreads.threadId, tid), eq(mailboxThreads.mailboxId, mailboxId)));
            }
        });

        if (refresh) {
            revalidatePath("/mail");
        }

        // 4) IMAP + search refresh (per thread)
        const { smtpQueue, searchIngestQueue } = await getRedis();

        await Promise.all(
            ids.map((threadId) =>
                smtpQueue.add(
                    "mail:set-flags",
                    { threadId, mailboxId, op: "unread" },
                    {
                        attempts: 3,
                        backoff: { type: "exponential", delay: 1500 },
                        removeOnComplete: true,
                        removeOnFail: false,
                    }
                )
            )
        );

        await Promise.all(
            ids.map((threadId) =>
                searchIngestQueue.add(
                    "refresh-thread",
                    { threadId },
                    {
                        jobId: `refresh-${threadId}`, // collapse dupes across callers
                        removeOnComplete: true,
                        removeOnFail: false,
                        attempts: 3,
                        backoff: { type: "exponential", delay: 1500 },
                    }
                )
            )
        );

        // if (refresh) {
        //     revalidatePath("/mail");
        // }
    }
);



// export const moveToTrash = async (threadId: string, mailboxId: string) => {
//     if (!threadId || !mailboxId) return;
//
//     const { smtpQueue, searchIngestQueue } = await getRedis();
//
//     await smtpQueue.add(
//         "mail:move",
//         {
//             threadId,
//             mailboxId,
//             op: "trash",
//         },
//         {
//             attempts: 3,
//             backoff: { type: "exponential", delay: 1500 },
//             removeOnComplete: true,
//             removeOnFail: false,
//         }
//     );
//
//     await searchIngestQueue.add("refresh-thread", { threadId: threadId }, {
//         jobId: `refresh-${threadId}`,    // collapses duplicates
//         removeOnComplete: true,
//         removeOnFail: false,
//         attempts: 3,
//         backoff: { type: "exponential", delay: 1500 },
//     });
//
//     revalidatePath("/mail");
// };

export const moveToTrash = async (
    threadIds: string | string[],
    mailboxId: string,
    refresh: boolean,
    messageId?: string,
) => {
    const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
        .map(String)
        .filter(Boolean);

    if (!ids.length || !mailboxId) return;

    const { smtpQueue, searchIngestQueue } = await getRedis();

    // 1) Queue IMAP move for each thread
    await Promise.all(
        ids.map((threadId) =>
            smtpQueue.add(
                "mail:move",
                { threadId, mailboxId, op: "trash", messageId },
                {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 1500 },
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            )
        )
    );

    // 2) Refresh search docs for each thread (collapse dupes via jobId)
    await Promise.all(
        ids.map((threadId) =>
            searchIngestQueue.add(
                "refresh-thread",
                { threadId },
                {
                    jobId: `refresh-${threadId}`,
                    removeOnComplete: true,
                    removeOnFail: false,
                    attempts: 3,
                    backoff: { type: "exponential", delay: 1500 },
                }
            )
        )
    );

    if (refresh) {
        revalidatePath("/mail");
    }
};





export const toggleStar = async (threadId: string, mailboxId: string, starred: boolean) => {
    if (!threadId || !mailboxId) return;

    const { smtpQueue, searchIngestQueue } = await getRedis();

    await smtpQueue.add(
        "mail:set-flags",
        {
            threadId,
            mailboxId,
            op: starred ? "unflag" : "flag",
        },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 1500 },
            removeOnComplete: true,
            removeOnFail: true,
        }
    );

    await searchIngestQueue.add("refresh-thread", { threadId: threadId }, {
        jobId: `refresh-${threadId}`,    // collapses duplicates
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: "exponential", delay: 1500 },
    });

    revalidatePath("/mail");
};


export const fetchMailboxThreads = async (identityPublicId: string, mailboxSlug: string, page: number) => {
    page = page && page > 0 ? page : 1;
    const rls = await rlsClient();
    const threads = await rls((tx) => {
        return tx
            .select()
            .from(mailboxThreads)
            .where(and(
                eq(mailboxThreads.identityPublicId, identityPublicId),
                eq(mailboxThreads.mailboxSlug, mailboxSlug),
            ))
            .orderBy(desc(mailboxThreads.lastActivityAt))
            .offset((page - 1) * 50)
            .limit(50)
    })
    return threads
};

export type FetchMailboxThreadsResult = Awaited<
    ReturnType<typeof fetchMailboxThreads>
>;



export type FetchMailboxThreadsByIdsResult = {
    threads: (typeof mailboxThreads.$inferSelect)[];
    missing?: string[]; // threadIds that weren't present in this mailbox
};

/**
 * Returns mailboxThreads rows for the given mailbox+threadIds.
 * Keeps the order of `threadIds` (so it matches your search ranking).
 */
export async function fetchMailboxThreadsList(
    mailboxId: string,
    threadIds: string[],
): Promise<FetchMailboxThreadsByIdsResult> {
    if (!threadIds?.length) return { threads: [] };

    const rls = await rlsClient();
    const rows = await rls((tx) =>
        tx
            .select()
            .from(mailboxThreads)
            .where(
                and(
                    eq(mailboxThreads.mailboxId, mailboxId),
                    inArray(mailboxThreads.threadId, threadIds),
                ),
            )
    );

    // preserve search order
    const rank = new Map(threadIds.map((id, i) => [id, i]));
    rows.sort(
        (a, b) => (rank.get(a.threadId) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.threadId) ?? Number.MAX_SAFE_INTEGER)
    );

    // optional: tell caller which hits didn’t belong to this mailbox
    const found = new Set(rows.map(r => r.threadId));
    const missing = threadIds.filter(id => !found.has(id));

    return { threads: rows, missing };
}



// export async function deleteForever(
//     threadIds: string | string[],
//     mailboxId: string,
//     refresh: boolean = true
// ) {
//     const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
//         .map(String)
//         .filter(Boolean);
//
//     if (!ids.length || !mailboxId) return;
//
//     const { smtpQueue, searchIngestQueue } = await getRedis();
//
//     await Promise.all(
//         ids.map(async (threadId) => {
//             // IMAP + DB hard-delete
//             await smtpQueue.add(
//                 "mail:delete-permanent",
//                 { threadId, mailboxId },
//                 {
//                     attempts: 3,
//                     backoff: { type: "exponential", delay: 1500 },
//                     removeOnComplete: true,
//                     removeOnFail: true,
//                 }
//             );
//
//             // Keep Typesense fresh (collapse dupes by jobId)
//             await searchIngestQueue.add(
//                 "refresh-thread",
//                 { threadId },
//                 {
//                     jobId: `refresh-${threadId}`,
//                     removeOnComplete: true,
//                     removeOnFail: false,
//                     attempts: 3,
//                     backoff: { type: "exponential", delay: 1500 },
//                 }
//             );
//         })
//     );
//
//     if (refresh) revalidatePath("/mail");
// }




export async function deleteForever(
    threadIds: string | string[] | null,
    mailboxId: string,
    refresh = true,
    opts?: { emptyAll?: boolean }   // NEW
) {
    const { emptyAll = false } = opts ?? {};
    const { smtpQueue, searchIngestQueue } = await getRedis();

    if (emptyAll) {
        await smtpQueue.add(
            "mail:delete-permanent",
            { mailboxId, emptyAll: true },
            {
                attempts: 3,
                backoff: { type: "exponential", delay: 1500 },
                removeOnComplete: true,
                removeOnFail: true,
            }
        );
        // no per-thread refresh here; your rebuild/refresh-thread will catch up
        if (refresh) revalidatePath("/mail");
        return;
    }

    const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
        .filter(Boolean)
        .map(String);

    if (!ids.length || !mailboxId) return;

    await Promise.all(
        ids.map(async (threadId) => {
            await smtpQueue.add(
                "mail:delete-permanent",
                { threadId, mailboxId },
                {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 1500 },
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            );

            await searchIngestQueue.add(
                "refresh-thread",
                { threadId },
                {
                    jobId: `refresh-${threadId}`,
                    removeOnComplete: true,
                    removeOnFail: false,
                    attempts: 3,
                    backoff: { type: "exponential", delay: 1500 },
                }
            );
        })
    );

    if (refresh) revalidatePath("/mail");
}
