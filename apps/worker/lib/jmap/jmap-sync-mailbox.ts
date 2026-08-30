import {
    db,
    jmapAccounts,
    mailboxes,
} from "@db";

import {
    and,
    eq,
} from "drizzle-orm";

import slugify from "@sindresorhus/slugify";

import type {
    JmapMailboxGetResponse,
} from "@jmap";

import { redisConnection } from "../get-redis";
import {inferKind} from "../../lib/imap/backfill/discover/discover-helpers";


function isDefaultMailbox(kind: string) {
    return [
        "inbox",
        "sent",
        "drafts",
        "archive",
        "spam",
        "trash",
    ].includes(kind);
}

export async function syncJmapMailboxes({
                                            identityId,
                                            workspaceId,
                                            remote,
                                        }: {
    identityId: string;
    workspaceId: string;
    remote: JmapMailboxGetResponse;
}) {
    const [account] = await db
        .select()
        .from(jmapAccounts)
        .where(
            and(
                eq(jmapAccounts.identityId, identityId),
                eq(jmapAccounts.workspaceId, workspaceId),
            ),
        )
        .limit(1);

    if (!account) {
        throw new Error(
            `JMAP account not found for identity ${identityId}`,
        );
    }

    const existingMailboxes = await db
        .select()
        .from(mailboxes)
        .where(
            eq(mailboxes.identityId, identityId),
        );

    const existingByRemoteId = new Map(
        existingMailboxes
            .filter(
                (mailbox) =>
                    (mailbox.metaData as any)?.jmapMailboxId,
            )
            .map((mailbox) => [
                String(
                    (mailbox.metaData as any).jmapMailboxId,
                ),
                mailbox,
            ]),
    );

    const localByRemoteId = new Map<
        string,
        typeof mailboxes.$inferSelect
    >();

    for (const remoteMailbox of remote.list) {
        const existing =
            existingByRemoteId.get(
                remoteMailbox.id,
            );

        const kind = inferKind(
            remoteMailbox.name,
            remoteMailbox.role,
        );

        const metaData = {
            ...(existing?.metaData ?? {}),
            provider: "jmap",
            jmapMailboxId: remoteMailbox.id,
            jmapRole: remoteMailbox.role,
            jmapParentId: remoteMailbox.parentId,
            isSubscribed: remoteMailbox.isSubscribed,
            sortOrder: remoteMailbox.sortOrder,
            totalEmails: remoteMailbox.totalEmails,
            unreadEmails: remoteMailbox.unreadEmails,
            totalThreads: remoteMailbox.totalThreads,
            unreadThreads: remoteMailbox.unreadThreads,
            myRights: remoteMailbox.myRights,
        };

        if (existing) {
            const [updated] = await db
                .update(mailboxes)
                .set({
                    name: remoteMailbox.name,
                    kind,
                    slug: slugify(
                        remoteMailbox.name,
                    ),
                        isDefault: isDefaultMailbox(kind),
                    metaData,
                    updatedAt: new Date(),
                })
                .where(
                    eq(
                        mailboxes.id,
                        existing.id,
                    ),
                )
                .returning();

            if (updated) {
                localByRemoteId.set(
                    remoteMailbox.id,
                    updated,
                );
            }

            continue;
        }

        const [created] = await db
            .insert(mailboxes)
            .values({
                ownerId: account.ownerId,
                workspaceId,
                identityId,
                parentId: null,
                kind,
                name: remoteMailbox.name,
                slug: slugify(
                    remoteMailbox.name,
                ),
                isDefault: isDefaultMailbox(kind),
                metaData,
            })
            .returning();

        if (created) {
            localByRemoteId.set(
                remoteMailbox.id,
                created,
            );
        }
    }

    for (const remoteMailbox of remote.list) {
        const localMailbox =
            localByRemoteId.get(
                remoteMailbox.id,
            );

        if (!localMailbox) continue;

        const localParent =
            remoteMailbox.parentId
                ? localByRemoteId.get(
                    remoteMailbox.parentId,
                )
                : null;

        const parentId =
            localParent?.id ?? null;

        if (
            localMailbox.parentId ===
            parentId
        ) {
            continue;
        }

        await db
            .update(mailboxes)
            .set({
                parentId,
                updatedAt: new Date(),
            })
            .where(
                eq(
                    mailboxes.id,
                    localMailbox.id,
                ),
            );
    }

    await db
        .update(jmapAccounts)
        .set({
            syncState: {
                ...(account.syncState ?? {}),
                mailbox: remote.state,
            },
            updatedAt: new Date(),
        })
        .where(
            eq(
                jmapAccounts.id,
                account.id,
            ),
        );

    const connection = redisConnection.connection

    const { Queue } = await import("bullmq");

    const jmapQueue = new Queue(
        "jmap-worker",
        { connection },
    );

    await jmapQueue.add(
        "jmap:backfill-account",
        {
            identityId,
            workspaceId,
        },
        {
            jobId: `jmap-backfill-account-${identityId}`,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    );

    await jmapQueue.close();

    return {
        account,
        mailboxes: Array.from(
            localByRemoteId.values(),
        ),
        state: remote.state,
    };
}
