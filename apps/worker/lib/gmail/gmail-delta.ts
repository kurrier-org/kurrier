import { getRedis } from "../../lib/get-redis";
import {
    ensureBackfillStartCursor,
    getGmailMeta,
    getMailboxByLabelId,
    syncGmailMessage,
    updateIdentityGmailMeta,
} from "./gmail-backfill";
import {gmailClientForIdentity} from "@providers";

import {
    db,
    labels,
    mailboxThreadLabels,
    mailboxThreads,
    messages,
} from "@db";
import { and, eq, inArray, sql } from "drizzle-orm";

import slugify from "@sindresorhus/slugify";
import {nanoid} from "nanoid";

const GMAIL_SYSTEM_LABEL_IDS = new Set([
    "INBOX",
    "SENT",
    "TRASH",
    "DRAFT",
    "SPAM",
    "UNREAD",
    "STARRED",
    "IMPORTANT",
    "CATEGORY_PERSONAL",
    "CATEGORY_SOCIAL",
    "CATEGORY_PROMOTIONS",
    "CATEGORY_UPDATES",
    "CATEGORY_FORUMS",
]);


async function cleanupOrphanGmailLabelParents(identityId: string) {
    while (true) {
        const rows = await db
            .select({ id: labels.id })
            .from(labels)
            .where(
                and(
                    eq(labels.identityId, identityId),
                    eq(labels.scope, "thread"),
                    sql`${labels.metaData}->'gmail'->>'labelId' is null`,
                    sql`not exists (
                        select 1
                        from labels child
                        where child.parent_id = ${labels.id}
                    )`,
                    sql`not exists (
                        select 1
                        from mailbox_thread_labels mtl
                        where mtl.label_id = ${labels.id}
                    )`,
                ),
            );

        if (!rows.length) break;

        await db
            .delete(labels)
            .where(inArray(labels.id, rows.map((r) => r.id)));
    }
}

async function syncGmailLabels(opts: { gmail: any; identity: any }) {
    const { gmail, identity } = opts;

    const res = await gmail.users.labels.list({ userId: "me" });
    const gmailLabels = res.data.labels ?? [];

    const desired = new Map<
        string,
        {
            name: string;
            path: string;
            parentPath: string | null;
            gmailLabelId: string | null;
        }
    >();

    for (const gl of gmailLabels) {
        if (!gl.id || !gl.name) continue;
        if (GMAIL_SYSTEM_LABEL_IDS.has(gl.id)) continue;

        const parts = String(gl.name).split("/").filter(Boolean);
        let path = "";

        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            const parentPath = path || null;
            path = path ? `${path}/${name}` : name;

            desired.set(path, {
                name,
                path,
                parentPath,
                gmailLabelId: i === parts.length - 1 ? gl.id : null,
            });
        }
    }

    const pathToId = new Map<string, string>();

    const desiredNodes = [...desired.values()].sort(
        (a, b) => a.path.split("/").length - b.path.split("/").length,
    );

    for (const node of desiredNodes) {
        const parentId = node.parentPath
            ? pathToId.get(node.parentPath) ?? null
            : null;

        const slug = slugify(node.name);

        let byGmailId: typeof labels.$inferSelect | undefined;
        let byPath: typeof labels.$inferSelect | undefined;
        let byNameParent: typeof labels.$inferSelect | undefined;

        if (node.gmailLabelId) {
            [byGmailId] = await db
                .select()
                .from(labels)
                .where(
                    and(
                        eq(labels.identityId, identity.id),
                        eq(labels.scope, "thread"),
                        sql`${labels.metaData}->'gmail'->>'labelId' = ${node.gmailLabelId}`,
                    ),
                )
                .limit(1);
        }

        [byPath] = await db
            .select()
            .from(labels)
            .where(
                and(
                    eq(labels.identityId, identity.id),
                    eq(labels.scope, "thread"),
                    sql`${labels.metaData}->'gmail'->>'path' = ${node.path}`,
                ),
            )
            .limit(1);

        if (!byGmailId && !byPath) {
            [byNameParent] = await db
                .select()
                .from(labels)
                .where(
                    and(
                        eq(labels.identityId, identity.id),
                        eq(labels.scope, "thread"),
                        eq(labels.name, node.name),
                        parentId
                            ? eq(labels.parentId, parentId)
                            : sql`${labels.parentId} is null`,
                    ),
                )
                .limit(1);
        }

        let existing = byGmailId ?? byPath ?? byNameParent;

        if (byGmailId && byPath && byGmailId.id !== byPath.id) {
            await db
                .update(mailboxThreadLabels)
                .set({ labelId: byPath.id })
                .where(eq(mailboxThreadLabels.labelId, byGmailId.id));

            await db
                .update(labels)
                .set({ parentId: byPath.id, updatedAt: new Date() })
                .where(eq(labels.parentId, byGmailId.id));

            await db.delete(labels).where(eq(labels.id, byGmailId.id));

            existing = byPath;
        }

        if (!existing) {
            const [inserted] = await db
                .insert(labels)
                .values({
                    ownerId: identity.ownerId,
                    workspaceId: identity.workspaceId,
                    identityId: identity.id,
                    publicId: nanoid(10),
                    name: node.name,
                    slug,
                    parentId,
                    scope: "thread",
                    isSystem: false,
                    metaData: {
                        gmail: {
                            labelId: node.gmailLabelId,
                            path: node.path,
                        },
                    },
                } as any)
                .returning();

            existing = inserted;
        } else {
            await db
                .update(labels)
                .set({
                    name: node.name,
                    slug,
                    parentId,
                    metaData: {
                        ...(existing.metaData ?? {}),
                        gmail: {
                            ...((existing.metaData as any)?.gmail ?? {}),
                            labelId: node.gmailLabelId,
                            path: node.path,
                        },
                    },
                    updatedAt: new Date(),
                })
                .where(eq(labels.id, existing.id));
        }

        pathToId.set(node.path, existing.id);
    }

    await cleanupOrphanGmailLabelParents(identity.id);
}


const GMAIL_DELTA_PAGE_SIZE = 100;

function getStoredGmailHistoryId(identity: any) {
    return getGmailMeta(identity).historyId ?? null;
}

async function getKurrierLabelsByGmailLabelId(identityId: string) {
    const rows = await db
        .select()
        .from(labels)
        .where(eq(labels.identityId, identityId));

    const map = new Map<string, (typeof rows)[number]>();

    for (const label of rows) {
        const gmailLabelId = (label.metaData as any)?.gmail?.labelId;
        if (gmailLabelId) {
            map.set(gmailLabelId, label);
        }
    }

    return map;
}

async function recomputeMailboxThread(threadId: string, mailboxId: string) {
    const [agg] = await db
        .select({
            messageCount: sql<number>`count(*)`,
            unreadCount: sql<number>`
				count(*) filter (where ${messages.seen} = false)
			`,
            anyFlagged: sql<boolean>`
				bool_or(${messages.flagged})
			`,
        })
        .from(messages)
        .where(
            and(
                eq(messages.threadId, threadId),
                eq(messages.mailboxId, mailboxId),
            ),
        );

    const messageCount = Number(agg?.messageCount ?? 0);

    if (messageCount === 0) {
        await db
            .delete(mailboxThreads)
            .where(
                and(
                    eq(mailboxThreads.threadId, threadId),
                    eq(mailboxThreads.mailboxId, mailboxId),
                ),
            );
        return;
    }

    await db
        .update(mailboxThreads)
        .set({
            messageCount,
            unreadCount: Number(agg?.unreadCount ?? 0),
            starred: Boolean(agg?.anyFlagged),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(mailboxThreads.threadId, threadId),
                eq(mailboxThreads.mailboxId, mailboxId),
            ),
        );
}

async function reconcileGmailMessageLabels(opts: {
    gmail: any;
    identity: any;
    messageId: string;
    mailboxByLabelId: Map<string, any>;
    kurrierLabelByGmailLabelId: Map<string, any>;
}) {
    const {
        gmail,
        identity,
        messageId,
        mailboxByLabelId,
        kurrierLabelByGmailLabelId,
    } = opts;

    let gm: any;

    try {
        const res = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "metadata",
        });
        gm = res.data;
    } catch (err: any) {
        const status = err?.code ?? err?.status ?? err?.response?.status;

        if (status === 404) {
            const rows = await db
                .select({
                    id: messages.id,
                    threadId: messages.threadId,
                    mailboxId: messages.mailboxId,
                    ownerId: messages.ownerId,
                    workspaceId: messages.workspaceId,
                })
                .from(messages)
                .where(sql`${messages.metaData}->'gmail'->>'messageId' = ${messageId}`);

            if (!rows.length) return;

            await db
                .delete(messages)
                .where(inArray(messages.id, rows.map((r) => r.id)));

            const affected = new Map<
                string,
                { threadId: string; mailboxId: string }
            >();

            for (const row of rows) {
                affected.set(`${row.threadId}:${row.mailboxId}`, {
                    threadId: row.threadId,
                    mailboxId: row.mailboxId,
                });
            }

            for (const row of affected.values()) {
                await recomputeMailboxThread(row.threadId, row.mailboxId);
            }

            return;
        }

        throw err;
    }

    const labelIds = gm.labelIds ?? [];

    const activeMailboxIds = new Set<string>();

    for (const gmailLabelId of labelIds) {
        const mailbox = mailboxByLabelId.get(gmailLabelId);
        if (mailbox) {
            activeMailboxIds.add(mailbox.id);
        }
    }

    const activeKurrierLabelIds = new Set<string>();

    for (const gmailLabelId of labelIds) {
        const label = kurrierLabelByGmailLabelId.get(gmailLabelId);
        if (label) {
            activeKurrierLabelIds.add(label.id);
        }
    }

    const allGmailManagedKurrierLabelIds = Array.from(
        kurrierLabelByGmailLabelId.values(),
    ).map((label) => label.id);

    await syncGmailMessage({
        gmail,
        identity,
        messageId,
        mailboxByLabelId,
        mode: "live",
    });

    const rows = await db
        .select({
            id: messages.id,
            threadId: messages.threadId,
            mailboxId: messages.mailboxId,
            ownerId: messages.ownerId,
            workspaceId: messages.workspaceId,
        })
        .from(messages)
        .where(sql`${messages.metaData}->'gmail'->>'messageId' = ${messageId}`);

    if (!rows.length) return;

    const affected = new Map<string, { threadId: string; mailboxId: string }>();

    for (const row of rows) {
        affected.set(`${row.threadId}:${row.mailboxId}`, {
            threadId: row.threadId,
            mailboxId: row.mailboxId,
        });
    }

    const staleRows = rows.filter((row) => !activeMailboxIds.has(row.mailboxId));

    if (staleRows.length) {
        await db
            .delete(messages)
            .where(inArray(messages.id, staleRows.map((r) => r.id)));
    }

    const remainingRows = rows.filter((row) => activeMailboxIds.has(row.mailboxId));

    await db
        .update(messages)
        .set({
            seen: !labelIds.includes("UNREAD"),
            flagged: labelIds.includes("STARRED"),
            updatedAt: new Date(),
        })
        .where(sql`${messages.metaData}->'gmail'->>'messageId' = ${messageId}`);

    if (allGmailManagedKurrierLabelIds.length) {
        for (const row of remainingRows) {
            await db
                .delete(mailboxThreadLabels)
                .where(
                    and(
                        eq(mailboxThreadLabels.threadId, row.threadId),
                        eq(mailboxThreadLabels.mailboxId, row.mailboxId),
                        inArray(
                            mailboxThreadLabels.labelId,
                            allGmailManagedKurrierLabelIds,
                        ),
                    ),
                );

            if (activeKurrierLabelIds.size) {
                await db
                    .insert(mailboxThreadLabels)
                    .values(
                        Array.from(activeKurrierLabelIds).map((labelId) => ({
                            threadId: row.threadId,
                            mailboxId: row.mailboxId,
                            labelId,
                            ownerId: row.ownerId,
                            workspaceId: row.workspaceId,
                        })),
                    )
                    .onConflictDoNothing();
            }

        }
    }

    for (const row of affected.values()) {
        await recomputeMailboxThread(row.threadId, row.mailboxId);
    }
}

export async function deltaSyncGmailAccount(job: any) {
    const { identityId, workspaceId, pageToken = undefined } = job.data;

    const { gmail, identity, googleAccount } = await gmailClientForIdentity(
        identityId,
        workspaceId,
    );

    let startHistoryId = getStoredGmailHistoryId(identity);

    if (!startHistoryId) {
        startHistoryId = await ensureBackfillStartCursor({ gmail, identity });
        console.info(
            `[GMAIL] No existing historyId for ${googleAccount.email}; initialized historyId=${startHistoryId}`,
        );
    }


    const mailboxByLabelId = await getMailboxByLabelId(identity.id);
    await syncGmailLabels({
        gmail,
        identity,
    });

    const kurrierLabelByGmailLabelId =
        await getKurrierLabelsByGmailLabelId(identity.id);

    let history;

    try {
        history = await gmail.users.history.list({
            userId: "me",
            startHistoryId,
            pageToken,
            maxResults: GMAIL_DELTA_PAGE_SIZE,
            historyTypes: ["messageAdded", "labelAdded", "labelRemoved"],
        });
    } catch (err: any) {
        const status = err?.code ?? err?.status ?? err?.response?.status;

        if (status === 404) {
            const { gmailQueue } = await getRedis();

            await updateIdentityGmailMeta(identity, {
                historyId: null,
                backfillCompleted: false,
                historyExpiredAt: new Date().toISOString(),
                backfill: {
                    startHistoryId: null,
                    currentPageToken: null,
                    restartedAt: new Date().toISOString(),
                },
            });

            await gmailQueue.add(
                "gmail:backfill-account",
                { identityId, workspaceId },
                {
                    jobId: `gmail-backfill-account-${identityId}`,
                    removeOnComplete: true,
                    removeOnFail: true,
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 5000,
                    },
                },
            );

            console.warn(
                `[GMAIL] historyId expired for ${googleAccount.email}; queued backfill`,
            );
            return;
        }

        throw err;
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let latestHistoryId = history.data.historyId ?? startHistoryId;

    for (const item of history.data.history ?? []) {
        const changedLabelMessageIds = new Set<string>();

        for (const added of item.messagesAdded ?? []) {
            const messageId = added.message?.id;
            if (!messageId) continue;

            const result = await syncGmailMessage({
                gmail,
                identity,
                messageId,
                mailboxByLabelId,
                mode: "live",
            });

            insertedCount += result.inserted;
            skippedCount += result.skipped;

            changedLabelMessageIds.add(messageId);

            if (result.historyId) latestHistoryId = result.historyId;
        }



        for (const labelAdded of item.labelsAdded ?? []) {
            const messageId = labelAdded.message?.id;
            if (messageId) changedLabelMessageIds.add(messageId);
        }

        for (const labelRemoved of item.labelsRemoved ?? []) {
            const messageId = labelRemoved.message?.id;
            if (messageId) changedLabelMessageIds.add(messageId);
        }

        for (const messageId of changedLabelMessageIds) {
            await reconcileGmailMessageLabels({
                gmail,
                identity,
                messageId,
                mailboxByLabelId,
                kurrierLabelByGmailLabelId,
            });
        }

        if (item.id) latestHistoryId = item.id;
    }

    await updateIdentityGmailMeta(identity, {
        historyId: history.data.historyId ?? latestHistoryId,
        lastDeltaSyncedAt: new Date().toISOString(),
    });

    console.info(
        `[GMAIL] Delta sync done for ${googleAccount.email}: inserted=${insertedCount}, skipped=${skippedCount}, next=${Boolean(history.data.nextPageToken)}`,
    );

    if (history.data.nextPageToken) {
        const { gmailQueue } = await getRedis();

        await gmailQueue.add(
            "gmail:delta-sync",
            {
                identityId,
                workspaceId,
                pageToken: history.data.nextPageToken,
            },
            {
                jobId: `gmail-delta-sync-${identityId}-${history.data.nextPageToken}`,
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            },
        );
    }
}
