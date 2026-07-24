import { getRedis } from "../../lib/get-redis";
import { db, identities, mailboxes, messages } from "@db";
import {and, eq, sql} from "drizzle-orm";
import { defaultImapQuota } from "@schema";
import { parseAndStoreEmail } from "../../lib/message-payload-parser";
import {gmailClientForIdentity} from "@providers";

type GmailQuota = {
    limit: number;
    expiresAt: string;
};

const GMAIL_BACKFILL_PAGE_SIZE = 100;
const GMAIL_BACKFILL_DELAY_MS = 1000;

const gmailQuotaMap = new Map<string, GmailQuota>();


function decodeGmailRaw(raw?: string | null) {
    if (!raw) return "";
    return Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export async function syncGmailMessage(opts: {
    gmail: any;
    identity: any;
    messageId: string;
    mailboxByLabelId: Map<string, any>;
    mode: "live" | "backfill";
    quota?: GmailQuota;
}) {
    const { gmail, identity, messageId, mailboxByLabelId, mode, quota } = opts;

    let full;

    try {
        full = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "raw",
        });
    } catch (err: any) {
        const status = err?.code ?? err?.status ?? err?.response?.status;

        if (status === 404) {
            console.warn(`[GMAIL] Message not found during sync: ${messageId}`);
            return {
                inserted: 0,
                skipped: 1,
                bytes: 0,
                historyId: null,
            };
        }

        throw err;
    }

    const gm = full.data;
    if (!gm.id || !gm.raw) return { inserted: 0, skipped: 1, bytes: 0, historyId: gm.historyId };

    const labelIds = gm.labelIds ?? [];

    const targetMailboxes = labelIds
        .map((labelId: string) => mailboxByLabelId.get(labelId))
        .filter(Boolean);


    if (!targetMailboxes.length) {
        return { inserted: 0, skipped: 1, bytes: 0, historyId: gm.historyId };
    }

    const rawEmail = decodeGmailRaw(gm.raw);
    if (!rawEmail) return { inserted: 0, skipped: 1, bytes: 0, historyId: gm.historyId };

    const sizeBytes = Buffer.byteLength(rawEmail, "utf8");

    if (quota && sizeBytes > quota.limit) {
        quota.limit = 0;
        return { inserted: 0, skipped: 0, bytes: 0, quotaExhausted: true, historyId: gm.historyId };
    }

    let inserted = 0;
    let skipped = 0;

    for (const mailbox of targetMailboxes) {
        const [existing] = await db
            .select({ id: messages.id })
            .from(messages)
            .where(
                and(
                    eq(messages.mailboxId, mailbox.id),
                    sql`${messages.metaData}->'gmail'->>'messageId' = ${gm.id}`,
                ),
            )
            .limit(1);

        if (existing) {
            skipped++;
            continue;
        }

        const message = await parseAndStoreEmail(rawEmail, {
            ownerId: identity.ownerId,
            workspaceId: identity.workspaceId,
            mailboxId: mailbox.id,
            rawStorageKey: `eml/${identity.ownerId}/${mailbox.id}/${gm.id}.eml`,
            emlKey: gm.id,
            metaData: {
                gmail: {
                    messageId: gm.id,
                    threadId: gm.threadId,
                    labelIds,
                    historyId: gm.historyId,
                    internalDate: gm.internalDate ?? null,
                },
            },
            mode,
            seen: !labelIds.includes("UNREAD"),
            flagged: labelIds.includes("STARRED"),
        });

        if (message) inserted++;
        else skipped++;
    }

    if (quota && inserted > 0) {
        quota.limit = Math.max(0, quota.limit - sizeBytes);
    }

    return { inserted, skipped, bytes: inserted > 0 ? sizeBytes : 0, historyId: gm.historyId };
}

function getDailyGmailQuota(identity: any): number {
    const meta = (identity.metaData as any) ?? {};
    const val = Number(meta.dailyQuota);
    return Number.isFinite(val) && val > 0 ? val : defaultImapQuota;
}

async function requeueBackfillAfterQuotaReset(opts: {
    identityId: string;
    workspaceId: string;
    pageToken?: string;
    quota: GmailQuota;
}) {
    const { gmailQueue } = await getRedis();

    const delay = Math.max(
        60_000,
        new Date(opts.quota.expiresAt).getTime() - Date.now(),
    );

    await gmailQueue.add(
        "gmail:backfill-account",
        {
            identityId: opts.identityId,
            workspaceId: opts.workspaceId,
            pageToken: opts.pageToken,
        },
        {
            jobId: `gmail-backfill-account-quota-resume-${opts.identityId}`,
            delay,
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

export async function getMailboxByLabelId(identityId: string) {
    const localMailboxes = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.identityId, identityId));

    const mailboxByLabelId = new Map<string, (typeof localMailboxes)[number]>();

    for (const mailbox of localMailboxes) {
        const labelId = (mailbox.metaData as any)?.gmail?.labelId;
        if (labelId) mailboxByLabelId.set(labelId, mailbox);
    }

    return mailboxByLabelId;
}

function getOrInitGmailQuota(identityId: string, dailyLimitBytes: number): GmailQuota {
    const now = Date.now();
    const existing = gmailQuotaMap.get(identityId);

    if (existing && now < new Date(existing.expiresAt).getTime()) {
        return existing;
    }

    const quota: GmailQuota = {
        limit: dailyLimitBytes,
        expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    };

    gmailQuotaMap.set(identityId, quota);
    return quota;
}


export function getGmailMeta(identity: any) {
    return ((identity.metaData as any)?.gmail ?? {}) as Record<string, any>;
}


export async function updateIdentityGmailMeta(identity: any, gmailMeta: Record<string, any>) {
    const currentMeta = (identity.metaData as any) ?? {};
    const currentGmailMeta = currentMeta.gmail ?? {};

    await db
        .update(identities)
        .set({
            metaData: {
                ...currentMeta,
                gmail: {
                    ...currentGmailMeta,
                    ...gmailMeta,
                    backfill: gmailMeta.backfill
                        ? {
                            ...(currentGmailMeta.backfill ?? {}),
                            ...gmailMeta.backfill,
                        }
                        : currentGmailMeta.backfill,
                },
            },
            updatedAt: new Date(),
        } as any)
        .where(eq(identities.id, identity.id));
}

export async function ensureBackfillStartCursor(opts: {
    gmail: any;
    identity: any;
}) {
    const { gmail, identity } = opts;
    const gmailMeta = getGmailMeta(identity);

    const existingStartHistoryId = gmailMeta.backfill?.startHistoryId;

    if (existingStartHistoryId) {
        return existingStartHistoryId;
    }

    const profile = await gmail.users.getProfile({ userId: "me" });
    const startHistoryId = profile.data.historyId;

    if (!startHistoryId) {
        throw new Error("Could not read Gmail profile historyId");
    }

    await updateIdentityGmailMeta(identity, {
        historyId: gmailMeta.historyId ?? startHistoryId,
        backfillCompleted: false,
        backfill: {
            startHistoryId,
            startedAt: new Date().toISOString(),
        },
    });

    return startHistoryId;
}


export async function backfillGmailAccount(job: any) {
    const { identityId, workspaceId, pageToken = undefined } = job.data;

    const { gmail, identity, googleAccount } = await gmailClientForIdentity(
        identityId,
        workspaceId,
    );

    const quota = getOrInitGmailQuota(
        identity.id,
        getDailyGmailQuota(identity),
    );

    if (quota.limit <= 0) {
        await requeueBackfillAfterQuotaReset({
            identityId,
            workspaceId,
            pageToken,
            quota,
        });

        console.info(`[GMAIL] Backfill quota exhausted for ${googleAccount.email}; resume at ${quota.expiresAt}`);
        return;
    }

    if (!pageToken) {
        const startHistoryId = await ensureBackfillStartCursor({ gmail, identity });

        console.info(
            `[GMAIL] Backfill started for ${googleAccount.email} from historyId=${startHistoryId}`,
        );
    }

    const mailboxByLabelId = await getMailboxByLabelId(identity.id);

    const listed = await gmail.users.messages.list({
        userId: "me",
        maxResults: GMAIL_BACKFILL_PAGE_SIZE,
        pageToken,
        includeSpamTrash: true,
    });

    const messageRefs = listed.data.messages ?? [];

    let insertedCount = 0;
    let skippedCount = 0;
    let batchBytes = 0;

    for (const ref of messageRefs) {
        if (!ref.id) continue;

        const result = await syncGmailMessage({
            gmail,
            identity,
            messageId: ref.id,
            mailboxByLabelId,
            mode: "backfill",
            quota,
        });

        if ((result as any).quotaExhausted) {
            await updateIdentityGmailMeta(identity, {
                backfillCompleted: false,
                backfill: {
                    currentPageToken: pageToken ?? null,
                    quotaExhaustedAt: new Date().toISOString(),
                    quotaResetsAt: quota.expiresAt,
                },
            });

            await requeueBackfillAfterQuotaReset({
                identityId,
                workspaceId,
                pageToken,
                quota,
            });

            console.info(`[GMAIL] Backfill quota exhausted mid-page for ${googleAccount.email}; resume at ${quota.expiresAt}`);
            return;
        }

        insertedCount += result.inserted;
        skippedCount += result.skipped;
        batchBytes += result.bytes;
    }

    console.info(
        `[GMAIL] Backfill page done for ${googleAccount.email}: inserted=${insertedCount}, skipped=${skippedCount}, bytes=${batchBytes}, remainingQuota=${quota.limit}, next=${Boolean(listed.data.nextPageToken)}`,
    );

    if (listed.data.nextPageToken) {
        const { gmailQueue } = await getRedis();

        await updateIdentityGmailMeta(identity, {
            backfillCompleted: false,
            backfill: {
                currentPageToken: listed.data.nextPageToken,
                lastPageSyncedAt: new Date().toISOString(),
                remainingQuotaBytes: quota.limit,
                quotaResetsAt: quota.expiresAt,
            },
        });

        await gmailQueue.add(
            "gmail:backfill-account",
            {
                identityId,
                workspaceId,
                pageToken: listed.data.nextPageToken,
            },
            {
                jobId: `gmail-backfill-account-${identityId}-${listed.data.nextPageToken}`,
                delay: GMAIL_BACKFILL_DELAY_MS,
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            },
        );

        return;
    }

    await updateIdentityGmailMeta(identity, {
        backfillCompleted: true,
        backfilledAt: new Date().toISOString(),
        backfill: {
            completedAt: new Date().toISOString(),
            currentPageToken: null,
            remainingQuotaBytes: quota.limit,
            quotaResetsAt: quota.expiresAt,
        },
    });

    const { gmailQueue } = await getRedis();

    await gmailQueue.add(
        "gmail:delta-sync",
        { identityId, workspaceId },
        {
            jobId: `gmail-delta-sync-after-backfill-${identityId}`,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000,
            },
        },
    );

    console.info(`[GMAIL] Backfill completed for ${googleAccount.email}; queued delta catch-up`);
}
