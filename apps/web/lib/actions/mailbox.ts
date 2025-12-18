"use server";

import { cache } from "react";
import { rlsClient } from "@/lib/actions/clients";
import {
    db, DraftMessageInsertSchema, draftMessages,
    identities,
    mailboxes,
    mailboxSync,
    mailboxThreads,
    messageAttachments,
    messages,
    threads,
} from "@db";
import {and, asc, count, desc, eq, inArray, isNotNull, isNull, lte, or, sql, gt} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {FormState, getServerEnv, handleAction, SearchThreadsResponse} from "@schema";
import { decode } from "decode-formdata";
import { toArray } from "@/lib/utils";

import Typesense, { Client } from "typesense";
import { isSignedIn } from "@/lib/actions/auth";
import slugify from "@sindresorhus/slugify";
import { redirect } from "next/navigation";
import { PAGE_SIZE } from "@common/mail-client";
import { getRedis } from "@/lib/actions/get-redis";
import dayjs from "dayjs";

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
		const [messagesCount] = activeMailbox?.id
			? await rls((tx) =>
					tx
						.select({ count: count() })
						.from(messages)
						.where(eq(messages.mailboxId, activeMailbox.id)),
				)
			: [{ count: 0 }];

		const [sync] = activeMailbox
			? await rls((tx) => {
					return tx
						.select()
						.from(mailboxSync)
						.where(eq(mailboxSync.mailboxId, activeMailbox.id));
				})
			: [null];

		return {
			activeMailbox,
			mailboxList,
			identity,
			count: Number(messagesCount.count),
			mailboxSync: sync,
		};
	},
);

export const fetchIdentityMailboxList = cache(async () => {
	const rls = await rlsClient();

	const rows = await rls((tx) =>
		tx
			.select({ identity: identities, mailbox: mailboxes })
			.from(identities)
			.leftJoin(
				mailboxes,
				and(
					eq(identities.id, mailboxes.identityId),
					sql`${mailboxes.kind} NOT IN ('outbox','drafts')`,
				),
			)
			.where(eq(identities.kind, "email"))
			.orderBy(
				asc(identities.id),
				sql`
                    CASE ${mailboxes.kind}
                    WHEN 'inbox'   THEN 0
                    WHEN 'drafts'  THEN 1
                    WHEN 'sent'    THEN 2
                    WHEN 'archive' THEN 3
                    WHEN 'spam'    THEN 4
                    WHEN 'trash'   THEN 5
                    WHEN 'outbox'  THEN 6
                    ELSE 7
                    END
                `,
				asc(mailboxes.parentId),
				sql`lower(coalesce(${mailboxes.name}, ''))`,
			),
	);

	const byIdentity = rows.reduce(
		(acc, r) => {
			const id = r.identity.id;
			if (!acc[id])
				acc[id] = {
					identity: r.identity,
					mailboxes: [] as (typeof mailboxes.$inferSelect)[],
				};
			if (r.mailbox) acc[id].mailboxes.push(r.mailbox);
			return acc;
		},
		{} as Record<
			string,
			{
				identity: typeof identities.$inferSelect;
				mailboxes: (typeof mailboxes.$inferSelect)[];
			}
		>,
	);

	const unreadAgg = await rls((tx) =>
		tx
			.select({
				mailboxId: mailboxThreads.mailboxId,
				unreadThreads: sql<number>`
        count(*) FILTER (WHERE ${mailboxThreads.unreadCount} > 0)
      `.as("unread_threads"),
				unreadTotal: sql<number>`
        coalesce(sum(${mailboxThreads.unreadCount}), 0)
      `.as("unread_total"),
			})
			.from(mailboxThreads)
			.groupBy(mailboxThreads.mailboxId),
	);

	const aggByMailbox = new Map<
		string,
		{ unreadThreads: number; unreadTotal: number }
	>(
		unreadAgg.map((a) => [
			a.mailboxId,
			{
				unreadThreads: Number(a.unreadThreads ?? 0),
				unreadTotal: Number(a.unreadTotal ?? 0),
			},
		]),
	);

	return Object.values(byIdentity);
});

export type FetchIdentityMailboxListResult = Awaited<
	ReturnType<typeof fetchIdentityMailboxList>
>;

export const fetchMailboxUnreadCounts = cache(async () => {
	const rls = await rlsClient();

	const unreadAgg = await rls((tx) =>
		tx
			.select({
				mailboxId: mailboxThreads.mailboxId,
				unreadThreads: sql<number>`
        count(*) FILTER (WHERE ${mailboxThreads.unreadCount} > 0)
      `.as("unread_threads"),
				unreadTotal: sql<number>`
        coalesce(sum(${mailboxThreads.unreadCount}), 0)
      `.as("unread_total"),
			})
			.from(mailboxThreads)
			.groupBy(mailboxThreads.mailboxId),
	);

	const aggByMailbox = new Map<
		string,
		{ unreadThreads: number; unreadTotal: number }
	>(
		unreadAgg.map((a) => [
			a.mailboxId,
			{
				unreadThreads: Number(a.unreadThreads ?? 0),
				unreadTotal: Number(a.unreadTotal ?? 0),
			},
		]),
	);

	return aggByMailbox;
});

export type FetchMailboxUnreadCountsResult = Awaited<
	ReturnType<typeof fetchMailboxUnreadCounts>
>;

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




export async function sendMail(_prev: FormState, formData: FormData): Promise<FormState> {
    const decodedForm = decode(formData) as any;

    if (toArray(decodedForm.to as any).length === 0) {
        return { success: false, error: "Please provide at least one recipient in the To field." };
    }

    const rls = await rlsClient();
    const scheduledAtRaw = decodedForm.scheduledAt ? String(decodedForm.scheduledAt) : "";
    if (scheduledAtRaw) {
        const d = dayjs(scheduledAtRaw);
        if (!d.isValid()) {
            return { success: false, error: "Invalid scheduled time." };
        }

        const identityId = await rls(async (tx) => {
            const [identity] = await tx.select({
                identityId: mailboxes.identityId,
            }).from(mailboxes).where(eq(mailboxes.id, decodedForm.mailboxId));
            return identity?.identityId;
        });

        const parsed = DraftMessageInsertSchema.safeParse({
            identityId,
            mailboxId: decodedForm.mailboxId,
            payload: decodedForm,
            status: "scheduled",
            scheduledAt: d.toDate(),
        });

        if (!parsed.success) {
            return { success: false, error: "There was an error trying to schedule your mail." };
        }


        const row = await rls(async (tx) => {
            const [created] = await tx.insert(draftMessages).values(parsed.data).returning({
                id: draftMessages.id,
                scheduledAt: draftMessages.scheduledAt,
            });
            return created ?? null;
        });

        if (!row?.id || !row.scheduledAt) {
            return { success: false, error: "Failed to schedule your mail." };
        }

        const { sendMailQueue } = await getRedis();
        const delay = Math.max(0, Number(new Date(row.scheduledAt)) - Number(new Date()));

        await sendMailQueue.add(
            "send-scheduled-draft",
            { draftMessageId: row.id },
            { jobId: row.id, delay },
        );
        revalidatePath("/dashboard/mail");
        return { success: true, data: { draftMessageId: row.id } };
    }

    const { sendMailQueue, sendMailEvents } = await getRedis();
    const job = await sendMailQueue.add("send-and-reconcile", decodedForm);
    return await job.waitUntilFinished(sendMailEvents);
}


export const deltaFetch = async ({ identityId }: { identityId: string }) => {
	const { smtpQueue, smtpEvents } = await getRedis();
	const job = await smtpQueue.add(
		"delta-fetch",
		{ identityId },
		{
			jobId: `delta-fetch-${identityId}`,
			removeOnComplete: true,
			removeOnFail: true,
		},
	);
	await job.waitUntilFinished(smtpEvents);
};

export const initSearch = async (
	query: string,
	ownerId: string,
	hasAttachment: boolean,
	onlyUnread: boolean,
	starred: boolean,
	page: number,
): Promise<SearchThreadsResponse> => {
	const client = getTypeSenseClient();

	const filters = [`ownerId:=${JSON.stringify(ownerId)}`];
	if (hasAttachment) filters.push("hasAttachment:=1");
	if (onlyUnread) filters.push("unread:=1");
	if (starred) filters.push("starred:=1"); // NEW

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
			per_page: PAGE_SIZE,
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
			starred: Number(d.starred) === 1, // NEW (if you want to use it in UI)
			createdAt: d.createdAt ?? 0,
			lastInThreadAt: d.lastInThreadAt ?? d.createdAt ?? 0,
		})),
		totalThreads: result?.found ?? sourceHits.length,
		totalMessages: result?.found_docs ?? sourceHits.length,
	};
};

export const backfillMailboxes = async (identityId: string) => {
	const { smtpQueue, smtpEvents } = await getRedis();
	const job = await smtpQueue.add(
		"imap:backfill-discover",
		{ identityId },
		{
			jobId: `imap-backfill-discover-${identityId}`,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 1000,
			},
		},
	);
	await job.waitUntilFinished(smtpEvents);
	backfillAccount(identityId);
};

export const backfillAccount = async (identityId: string) => {
	const { smtpQueue } = await getRedis();
	await smtpQueue.add(
		"imap:backfill-tick",
		{},
		{
			removeOnComplete: true,
			removeOnFail: true,
			jobId: "imap-backfill-tick-on-demand",
		},
	);
	await smtpQueue.add(
		"imap:start-idle",
		{ identityId },
		{
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
		},
	);
};

export const fetchWebMailThreadDetail = cache(async (threadId: string) => {
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
			return {
				thread: null,
				messages: [] as (typeof rows)[number]["message"][],
			};
		}

		const thread = rows[0].thread;
		const msgs = rows.map((r) => r.message);
		return { thread, messages: msgs };
	});
	return result;
});

export const markAsRead = cache(
	async (
		threadIds: string | string[],
		mailboxId: string,
		markSmtp: boolean,
		refresh = true,
	) => {
		const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
			.map(String)
			.filter(Boolean);

		if (!ids.length || !mailboxId) return;

		const now = new Date();
		const rls = await rlsClient();

		await rls(async (tx) => {
			await tx
				.update(messages)
				.set({ seen: true, updatedAt: now })
				.where(
					and(
						inArray(messages.threadId, ids),
						eq(messages.mailboxId, mailboxId),
					),
				);

			await tx
				.update(mailboxThreads)
				.set({ unreadCount: 0, updatedAt: now })
				.where(
					and(
						inArray(mailboxThreads.threadId, ids),
						eq(mailboxThreads.mailboxId, mailboxId),
					),
				);
		});

		if (refresh) {
			revalidatePath("/dashboard/mail");
		}

		if (markSmtp) {
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
						},
					),
				),
			);

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
						},
					),
				),
			);
		}
	},
);

export const markAsUnread = async (
	threadIds: string | string[],
	mailboxId: string,
	markSmtp: boolean,
	refresh: boolean,
) => {
	const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
		.map(String)
		.filter(Boolean);

	if (!ids.length || !mailboxId) return;

	const now = new Date();
	const rls = await rlsClient();

	await rls(async (tx) => {
		await tx
			.update(messages)
			.set({ seen: false, updatedAt: now })
			.where(
				and(inArray(messages.threadId, ids), eq(messages.mailboxId, mailboxId)),
			);

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
					eq(messages.seen, false),
				),
			)
			.groupBy(messages.threadId);

		const countMap = new Map<string, number>();
		for (const g of grouped) countMap.set(String(g.threadId), Number(g.count));

		for (const tid of ids) {
			const unread = countMap.get(tid);
			await tx
				.update(mailboxThreads)
				.set({
					unreadCount: unread ?? 1, // fallback to 1 so it surfaces in UI if uncertain
					updatedAt: now,
				})
				.where(
					and(
						eq(mailboxThreads.threadId, tid),
						eq(mailboxThreads.mailboxId, mailboxId),
					),
				);
		}
	});

	if (refresh) {
		revalidatePath("/mail");
	}

	if (markSmtp) {
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
					},
				),
			),
		);

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
					},
				),
			),
		);
	}
};

export const moveToTrash = async (
	threadIds: string | string[],
	mailboxId: string,
	moveImap: boolean,
	refresh: boolean,
	messageId?: string,
) => {
	const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
		.map(String)
		.filter(Boolean);

	if (!ids.length || !mailboxId) return;

	const { smtpQueue, searchIngestQueue } = await getRedis();

	await Promise.all(
		ids.map((threadId) =>
			smtpQueue.add(
				"mail:move",
				{ threadId, mailboxId, op: "trash", messageId, moveImap },
				{
					attempts: 3,
					backoff: { type: "exponential", delay: 1500 },
					removeOnComplete: true,
					removeOnFail: false,
				},
			),
		),
	);

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
				},
			),
		),
	);

	if (refresh) {
		revalidatePath("/mail");
	}
};

export const toggleStar = async (
	threadId: string,
	mailboxId: string,
	starred: boolean,
	starImap: boolean,
) => {
	if (!threadId || !mailboxId) return;
	const { smtpQueue, searchIngestQueue } = await getRedis();

	if (starImap) {
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
			},
		);
	} else {
		const rls = await rlsClient();
		const op = starred ? "unflag" : "flag";
		await rls(async (tx) => {
			const update: Record<string, any> = { updatedAt: new Date() };
			if (op === "flag") update.flagged = true;
			if (op === "unflag") update.flagged = false;

			await tx
				.update(messages)
				.set(update)
				.where(
					and(
						eq(messages.threadId, threadId),
						eq(messages.mailboxId, mailboxId),
					),
				);

			const [agg] = await tx
				.select({
					unreadCount: sql<number>`count(*) filter (where
                    ${messages.seen}
                    =
                    false
                    )`,
					anyFlagged: sql<boolean>`bool_or
                    (
                    ${messages.flagged}
                    )`,
				})
				.from(messages)
				.where(
					and(
						eq(messages.threadId, threadId),
						eq(messages.mailboxId, mailboxId),
					),
				);

			await tx
				.update(mailboxThreads)
				.set({
					unreadCount: agg.unreadCount ?? 0,
					starred: agg.anyFlagged ?? false,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(mailboxThreads.threadId, threadId),
						eq(mailboxThreads.mailboxId, mailboxId),
					),
				);
		});
	}

	await searchIngestQueue.add(
		"refresh-thread",
		{ threadId: threadId },
		{
			jobId: `refresh-${threadId}`,
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
		},
	);

	revalidatePath("/mail");
};

export const fetchMailboxThreadsOld = async (
	identityPublicId: string,
	mailboxSlug: string,
	page: number,
) => {
	page = page && page > 0 ? page : 1;
	const rls = await rlsClient();
	const threads = await rls((tx) => {
		return tx
			.select()
			.from(mailboxThreads)
			.where(
				and(
					eq(mailboxThreads.identityPublicId, identityPublicId),
					eq(mailboxThreads.mailboxSlug, mailboxSlug),
				),
			)
			.orderBy(desc(mailboxThreads.lastActivityAt))
			.offset((page - 1) * PAGE_SIZE)
			.limit(PAGE_SIZE);
	});
	return threads;
};

export const fetchMailboxThreads = async (
    identityPublicId: string,
    mailboxSlug: string,
    page: number,
) => {
    page = page && page > 0 ? page : 1;

    const rls = await rlsClient();

    const now = new Date();
    const effectiveActivityAt = sql`COALESCE(${mailboxThreads.unsnoozedAt}, ${mailboxThreads.lastActivityAt})`;

    const threads = await rls((tx) =>
        tx
            .select()
            .from(mailboxThreads)
            .where(
                and(
                    eq(mailboxThreads.identityPublicId, identityPublicId),
                    eq(mailboxThreads.mailboxSlug, mailboxSlug),
                    or(isNull(mailboxThreads.snoozedUntil), lte(mailboxThreads.snoozedUntil, now)),
                ),
            )
            .orderBy(desc(effectiveActivityAt), desc(mailboxThreads.lastActivityAt), desc(mailboxThreads.threadId))
            .offset((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE),
    );

    return threads;
};

export type FetchMailboxThreadsResult = Awaited<
	ReturnType<typeof fetchMailboxThreads>
>;

export type FetchMailboxThreadsByIdsResult = {
	threads: (typeof mailboxThreads.$inferSelect)[];
	missing?: string[];
};

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
			),
	);

	const rank = new Map(threadIds.map((id, i) => [id, i]));
	rows.sort(
		(a, b) =>
			(rank.get(a.threadId) ?? Number.MAX_SAFE_INTEGER) -
			(rank.get(b.threadId) ?? Number.MAX_SAFE_INTEGER),
	);

	const found = new Set(rows.map((r) => r.threadId));
	const missing = threadIds.filter((id) => !found.has(id));

	return { threads: rows, missing };
}

export async function deleteForever(
	threadIds: string | string[] | null,
	mailboxId: string,
	imapDelete: boolean,
	refresh = true,
	opts?: { emptyAll?: boolean },
) {
	const { emptyAll = false } = opts ?? {};
	const { smtpQueue, searchIngestQueue } = await getRedis();

	if (emptyAll) {
		await smtpQueue.add(
			"mail:delete-permanent",
			{ mailboxId, emptyAll: true, imapDelete },
			{
				attempts: 3,
				backoff: { type: "exponential", delay: 1500 },
				removeOnComplete: true,
				removeOnFail: true,
			},
		);
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
				{ threadId, mailboxId, imapDelete },
				{
					attempts: 3,
					backoff: { type: "exponential", delay: 1500 },
					removeOnComplete: true,
					removeOnFail: true,
				},
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
				},
			);
		}),
	);

	if (refresh) revalidatePath("/mail");
}

export async function addNewMailboxFolder(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const decodedForm = decode(formData);
	const isImapOp = String(decodedForm.imapOp).trim().length > 0;
	const user = await isSignedIn();
	if (isImapOp) {
		const { smtpQueue, smtpEvents } = await getRedis();
		const job = await smtpQueue.add(
			"mailbox:add-new",
			{
				name: decodedForm.name,
				parentId: decodedForm.parentId,
				identityId: decodedForm.identityId,
				ownerId: user?.id,
				kind: "custom",
				slug: slugify(String(decodedForm.name)),
			},
			{
				attempts: 3,
				backoff: { type: "exponential", delay: 1500 },
				removeOnComplete: true,
				removeOnFail: true,
			},
		);

		await job.waitUntilFinished(smtpEvents);
		revalidatePath("/dashboard/mail");
	} else {
		const name = String(decodedForm.name ?? "").trim();
		if (!name)
			return { success: false, error: "Folder name is required" } as any;

		const ownerId = String(user?.id ?? "");
		const identityId = String(decodedForm.identityId);
		const parentId =
			decodedForm.parentId && decodedForm.parentId !== "none"
				? String(decodedForm.parentId)
				: null;

		if (parentId) {
			const [parent] = await db
				.select({ id: mailboxes.id, identityId: mailboxes.identityId })
				.from(mailboxes)
				.where(eq(mailboxes.id, parentId))
				.limit(1);

			if (!parent || parent.identityId !== identityId) {
				return { success: false, error: "Invalid parent folder" } as any;
			}
		}

		await db
			.insert(mailboxes)
			.values({
				ownerId,
				identityId,
				parentId,
				kind: "custom",
				name,
				slug: slugify(name.toLowerCase()),
				isDefault: false,
				metaData: {},
			})
			.returning();

		revalidatePath("/dashboard/mail");
	}

	return {
		success: true,
	};
}

export async function deleteMailboxFolder({
	imapOp,
	identityId,
	mailboxId,
}: {
	imapOp: boolean;
	identityId: string;
	mailboxId: string;
}): Promise<FormState> {
	const user = await isSignedIn();

	if (!imapOp) {
		const [mailbox] = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.id, mailboxId))
			.limit(1);

		if (!mailbox) return { success: false, error: "Folder not found" } as any;
		if (mailbox.isDefault)
			return { success: false, error: "Cannot delete a default folder" } as any;

		// Delete any subfolders first
		await db.delete(mailboxes).where(eq(mailboxes.parentId, mailboxId));

		// Delete this mailbox and any sync info
		await db.delete(mailboxSync).where(eq(mailboxSync.mailboxId, mailboxId));
		await db.delete(mailboxes).where(eq(mailboxes.id, mailboxId));

		revalidatePath("/dashboard/mail");
		return { success: true };
	}

	const [ident] = await db
		.select({ id: identities.id })
		.from(identities)
		.where(eq(identities.publicId, identityId))
		.limit(1);

	if (!ident) throw new Error("Identity not found");

	const { smtpQueue, smtpEvents } = await getRedis();

	const job = await smtpQueue.add(
		"mailbox:delete-folder",
		{
			mailboxId,
			identityId: ident.id,
			ownerId: user?.id,
		},
		{
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
			removeOnComplete: true,
			removeOnFail: true,
		},
	);

	await job.waitUntilFinished(smtpEvents);
	redirect(`/dashboard/mail/${identityId}/inbox`);
	return { success: true };
}

export const moveToFolder = async (
	threadIds: string | string[],
	fromMailboxId: string, // current mailbox
	toMailboxId: string, // destination mailbox (UUID)
	moveImap: boolean, // perform IMAP move when true
	refresh: boolean,
	messageId?: string,
) => {
	const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
		.map(String)
		.filter(Boolean);

	if (
		!ids.length ||
		!fromMailboxId ||
		!toMailboxId ||
		fromMailboxId === toMailboxId
	)
		return;

	const { smtpQueue, searchIngestQueue } = await getRedis();

	await Promise.all(
		ids.map((threadId) =>
			smtpQueue.add(
				"mail:move",
				{
					threadId,
					mailboxId: fromMailboxId,
					op: "move",
					toMailboxId,
					messageId,
					moveImap,
				},
				{
					jobId: `move:${threadId}:${fromMailboxId}->${toMailboxId}`,
					attempts: 3,
					backoff: { type: "exponential", delay: 1500 },
					removeOnComplete: true,
					removeOnFail: false,
				},
			),
		),
	);

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
				},
			),
		),
	);

	if (refresh) revalidatePath("/mail");
};

export const clearImapClients = async (identityId: string) => {
	const { smtpQueue } = await getRedis();
	await smtpQueue.add(
		"imap:stop-idle",
		{ identityId },
		{
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
		},
	);
};


export const fetchScheduledDraftCounts = async () => {
    const rls = await rlsClient();
    const rows = await rls((tx) =>
        tx
            .select()
            .from(draftMessages)
            .where(eq(draftMessages.status, "scheduled")),
    );
    return rows
};

export const fetchScheduledDrafts = async (identityPublicId: string) => {
    const rls = await rlsClient();
    const [identity] = await rls((tx) =>
        tx
            .select()
            .from(identities)
            .where(eq(identities.publicId, identityPublicId)),
    );
    const rows = await rls((tx) =>
        tx
            .select()
            .from(draftMessages)
            .where(
                and(
                    eq(draftMessages.status, "scheduled"),
                    eq(draftMessages.identityId, identity.id)
                )
            ),
    );
    return rows;
};

export async function deleteScheduledDraft(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        const rls = await rlsClient();
        await rls(async (tx) => {
            await tx
                .delete(draftMessages)
                .where(eq(draftMessages.id, String(decodedForm.draftId)),);
        })

        revalidatePath("/dashboard/mail");
        return { success: true };
    });
}


export async function snoozeThread(input: {
    mailboxThreadId: string;
    activeMailboxId: string;
    snoozedUntil: string | null;
}) {
    return handleAction(async () => {

        const {
            mailboxThreadId,
            activeMailboxId,
            snoozedUntil
        } = input;

        const rls = await rlsClient();
        await rls(async (tx) => {
            return tx
                .update(mailboxThreads)
                .set({
                    snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null,
                    unsnoozedAt: snoozedUntil ? null : new Date(),
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(mailboxThreads.threadId, mailboxThreadId),
                    eq(mailboxThreads.mailboxId, activeMailboxId)
                )).returning()
        })

        revalidatePath("/dashboard/mail");
        return { success: true };
    });

}


export const fetchIdentitySnoozedThreads = async (identityPublicId: string) => {
    const rls = await rlsClient();
    const now = new Date();

    const threads = await rls((tx) => {
        return tx
            .select()
            .from(mailboxThreads)
            .where(
                and(
                    isNotNull(mailboxThreads.snoozedUntil),
                    gt(mailboxThreads.snoozedUntil, now),
                ),
            )
            .orderBy(desc(mailboxThreads.snoozedUntil), desc(mailboxThreads.lastActivityAt));
    });

    return { threads };
};
