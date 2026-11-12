"use server";

import { cache } from "react";
import { rlsClient } from "@/lib/actions/clients";
import {
	db,
	DraftMessageInsertSchema,
	draftMessages,
	emailSignatures,
	identities,
	mailboxes,
	mailboxSync,
	MailboxThreadEntity,
	mailboxThreads,
	mailSubscriptions,
	messageAttachments,
	messages,
	threads,
	workspaces,
} from "@db";
import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	lte,
	or,
	sql,
	gt,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
	FormState,
	getServerEnv,
	handleAction,
	SearchThreadsResponse,
} from "@schema";
import { decode } from "decode-formdata";
import { toArray } from "@/lib/utils";

import Typesense, { Client } from "typesense";
import { isSignedIn } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { PAGE_SIZE } from "@common/mail-client";
import { getRedis } from "@/lib/actions/get-redis";
import dayjs from "dayjs";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/create-s3-client";
import { isGmailIdentity } from "@common";
import { access } from "@/lib/actions/shared";
import {
	EmailDocument,
	renderEmailFragment,
	renderEmailText,
} from "@email-editor";

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
				.where(eq(identities.publicId, identityPublicId))
				.limit(1),
		);

		if (!identity) throw new Error("Identity not found");

		const [mailboxList, activeMailbox] = await Promise.all([
			rls((tx) =>
				tx
					.select()
					.from(mailboxes)
					.where(eq(mailboxes.identityId, identity.id)),
			),

			rls((tx) =>
				tx
					.select()
					.from(mailboxes)
					.where(
						and(
							eq(mailboxes.identityId, identity.id),
							eq(mailboxes.slug, mailboxSlug),
						),
					)
					.limit(1),
			).then((rows) => rows[0]),
		]);

		if (!activeMailbox) throw new Error("Mailbox not found");

		const [messagesCountRow, sync] = await Promise.all([
			rls((tx) =>
				tx
					.select({ count: count() })
					.from(messages)
					.where(eq(messages.mailboxId, activeMailbox.id)),
			).then((rows) => rows[0]),

			rls((tx) =>
				tx
					.select()
					.from(mailboxSync)
					.where(eq(mailboxSync.mailboxId, activeMailbox.id))
					.limit(1),
			).then((rows) => rows[0] ?? null),
		]);

		return {
			activeMailbox,
			mailboxList,
			identity,
			count: Number(messagesCountRow?.count ?? 0),
			mailboxSync: sync,
		};
	},
);

export type FetchMailboxResult = Awaited<ReturnType<typeof fetchMailbox>>;

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

			if (!acc[id]) {
				acc[id] = {
					identity: r.identity,
					mailboxes: [],
				};
			}

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

	return Object.values(byIdentity);
});

export type FetchIdentityMailboxListResult = Awaited<
	ReturnType<typeof fetchIdentityMailboxList>
>;

export const fetchMailboxUnreadCounts = cache(async () => {
	const rls = await rlsClient();
	const now = new Date();

	const unreadAgg = await rls((tx) =>
		tx
			.select({
				mailboxId: mailboxThreads.mailboxId,
				unreadThreads: sql<number>`
						count(*) FILTER (WHERE ${mailboxThreads.unreadCount} > 0)
					`,
				unreadTotal: sql<number>`
						coalesce(sum(${mailboxThreads.unreadCount}), 0)
					`,
			})
			.from(mailboxThreads)
			.where(
				or(
					isNull(mailboxThreads.snoozedUntil),
					lte(mailboxThreads.snoozedUntil, now),
				),
			)
			.groupBy(mailboxThreads.mailboxId),
	);

	return new Map<string, { unreadThreads: number; unreadTotal: number }>(
		unreadAgg.map((a) => [
			a.mailboxId,
			{
				unreadThreads: Number(a.unreadThreads ?? 0),
				unreadTotal: Number(a.unreadTotal ?? 0),
			},
		]),
	);
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

export async function getSignedUrlsForMessage(messageId: string) {
	const { S3_BUCKET } = getServerEnv();
	const rls = await rlsClient();
	const attachments = await rls((tx) =>
		tx
			.select()
			.from(messageAttachments)
			.where(eq(messageAttachments.messageId, messageId)),
	);
	const results = await Promise.all(
		attachments.map(async (attachment) => {
			const command = new GetObjectCommand({
				Bucket: S3_BUCKET!,
				Key: attachment.path!,
			});

			const url = await getSignedUrl(s3, command, { expiresIn: 300 });

			return {
				...attachment,
				signedUrl: url,
			};
		}),
	);
	return results;
}

export const revalidateMailbox = async (path: string) => {
	revalidatePath(path);
};

const isSignaturePublicId = (value: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	);

export async function sendMail(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const decodedForm = decode(formData) as any;

	const rls = await rlsClient();

	const identity = await rls(async (tx) => {
		const [identity] = await tx
			.select()
			.from(identities)
			.where(eq(identities.publicId, decodedForm.identityPublicId))
			.limit(1);

		return identity;
	});

	if (!identity) {
		return {
			success: false,
			error: "Identity not found.",
		};
	}

	const boxes = await rls(async (tx) =>
		tx.select().from(mailboxes).where(eq(mailboxes.identityId, identity.id)),
	);

	const sentMailbox = boxes.find((box) => box.kind === "sent");

	const inboxMailbox = boxes.find((box) => box.kind === "inbox");

	if (!sentMailbox || !inboxMailbox) {
		return {
			success: false,
			error: "Required mailboxes (inbox and sent) not found for the identity.",
		};
	}

	decodedForm.sentMailboxId = sentMailbox.id;
	decodedForm.mailboxId = inboxMailbox.id;
	decodedForm.identityId = identity.id;

	decodedForm.appendToSent =
		identity.metaData?.provider === "kurrier-mail" ||
		(!!identity.smtpAccountId && !identity.providerId);

	if (toArray(decodedForm.to as any).length === 0) {
		return {
			success: false,
			error: "Please provide at least one recipient in the To field.",
		};
	}

	const signaturePublicId =
		typeof decodedForm.signaturePublicId === "string"
			? decodedForm.signaturePublicId.trim()
			: "";

	if (signaturePublicId) {
		if (!isSignaturePublicId(signaturePublicId)) {
			return {
				success: false,
				error: "Invalid email signature.",
			};
		}

		const signature = await rls(async (tx) => {
			const [result] = await tx
				.select({
					document: emailSignatures.document,
				})
				.from(emailSignatures)
				.where(
					and(
						eq(emailSignatures.publicId, signaturePublicId),
						eq(emailSignatures.identityId, identity.id),
					),
				)
				.limit(1);

			return result;
		});

		if (!signature) {
			return {
				success: false,
				error: "Email signature not found for this identity.",
			};
		}

		const signatureDocument = signature.document as unknown as EmailDocument;

		const signatureHtml = renderEmailFragment(signatureDocument).trim();

		const signatureText = renderEmailText(signatureDocument).trim();

		const messageHtml =
			typeof decodedForm.html === "string" ? decodedForm.html : "";

		const messageText =
			typeof decodedForm.text === "string" ? decodedForm.text : "";

		if (signatureHtml) {
			decodedForm.html = [
				messageHtml,
				messageHtml.trim() ? "<br>" : "",
				`<div data-kurrier-signature="true">${signatureHtml}</div>`,
			].join("");
		}

		if (signatureText) {
			decodedForm.text = [messageText.trimEnd(), signatureText]
				.filter(Boolean)
				.join("\n\n");
		}
	}

	/*
	 * The payload now contains the rendered
	 * signature. Scheduled mail therefore
	 * preserves the signature as it appeared
	 * when the message was scheduled.
	 */
	const scheduledAtRaw = decodedForm.scheduledAt
		? String(decodedForm.scheduledAt)
		: "";

	if (scheduledAtRaw) {
		const scheduledAt = dayjs(scheduledAtRaw);

		if (!scheduledAt.isValid()) {
			return {
				success: false,
				error: "Invalid scheduled time.",
			};
		}

		const parsed = DraftMessageInsertSchema.safeParse({
			identityId: identity.id,
			mailboxId: decodedForm.mailboxId,
			payload: decodedForm,
			status: "scheduled",
			scheduledAt: scheduledAt.toDate(),
		});

		if (!parsed.success) {
			return {
				success: false,
				error: "There was an error trying to schedule your mail.",
			};
		}

		const row = await rls(async (tx) => {
			const [created] = await tx
				.insert(draftMessages)
				.values(parsed.data)
				.returning({
					id: draftMessages.id,
					scheduledAt: draftMessages.scheduledAt,
				});

			return created ?? null;
		});

		if (!row?.id || !row.scheduledAt) {
			return {
				success: false,
				error: "Failed to schedule your mail.",
			};
		}

		const { sendMailQueue } = await getRedis();

		const delay = Math.max(
			0,
			Number(new Date(row.scheduledAt)) - Number(new Date()),
		);

		await sendMailQueue.add(
			"send-scheduled-draft",
			{
				draftMessageId: row.id,
			},
			{
				jobId: row.id,
				delay,
			},
		);

		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);

		return {
			success: true,
			data: {
				draftMessageId: row.id,
			},
		};
	}

	const { sendMailQueue, sendMailEvents } = await getRedis();

	const job = await sendMailQueue.add("send-and-reconcile", decodedForm);

	try {
		return await job.waitUntilFinished(sendMailEvents);
	} catch (error) {
		console.error("[sendMail] Send job failed", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Could not send your email.",
		};
	}
}

export const deltaFetch = async ({ identityId }: { identityId: string }) => {
	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId))
		.limit(1);

	if (!identity) {
		return;
	}
	if (!(await canSyncWorkspace())) {
		console.info(
			`[delta-fetch:${identityId}] mail sync disabled for workspace ${identity.workspaceId}`,
		);
		return;
	}

	const isGmail = await isGmailIdentity(identityId);

	// const isImap =
	// 	Boolean(identity.smtpAccountId) ||
	// 	identity.metaData?.provider === "kurrier-mail";

	const isImap =
		Boolean(identity.smtpAccountId) ||
		identity.metaData?.provider === "kurrier-mail" ||
		identity.metaData?.provider === "microsoft";

	if (isGmail) {
		const { gmailQueue, gmailEvents } = await getRedis();

		const job = await gmailQueue.add(
			"gmail:delta-sync",
			{
				identityId,
				workspaceId: identity.workspaceId,
			},
			{
				jobId: `gmail-delta-sync-${identityId}`,
				removeOnComplete: true,
				removeOnFail: true,
			},
		);

		await job.waitUntilFinished(gmailEvents);
		return;
	}

	if (isImap) {
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
	}
};

export const initSearch = async (
	query: string,
	workspacePublicId: string,
	identityPublicId: string,
	mailboxSlug: string,
	hasAttachment: boolean,
	onlyUnread: boolean,
	starred: boolean,
	page: number,
): Promise<SearchThreadsResponse> => {
	const q = query.trim();
	if (!q) {
		return { items: [], totalThreads: 0, totalMessages: 0 };
	}

	const rls = await rlsClient();
	const [mailbox] = await rls((tx) =>
		tx
			.select({ id: mailboxes.id })
			.from(mailboxes)
			.innerJoin(identities, eq(identities.id, mailboxes.identityId))
			.innerJoin(workspaces, eq(workspaces.id, mailboxes.workspaceId))
			.where(
				and(
					eq(workspaces.publicId, workspacePublicId),
					eq(identities.workspaceId, mailboxes.workspaceId),
					eq(identities.publicId, identityPublicId),
					eq(mailboxes.slug, mailboxSlug),
				),
			)
			.limit(1),
	);
	if (!mailbox) throw new Error("Mailbox not found");

	const client = getTypeSenseClient();
	const filters = [`mailboxId:=${mailbox.id}`];

	if (hasAttachment) filters.push("hasAttachment:=1");
	if (onlyUnread) filters.push("unread:=1");
	if (starred) filters.push("starred:=1");

	const result = (await client
		.collections("messages")
		.documents()
		.search({
			q,
			query_by: "subject,html,text,snippet,fromName,fromEmail,participants",
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
			starred: Number(d.starred) === 1,
			createdAt: d.createdAt ?? 0,
			lastInThreadAt: d.lastInThreadAt ?? d.createdAt ?? 0,
		})),
		totalThreads: result?.found ?? sourceHits.length,
		totalMessages: result?.found_docs ?? sourceHits.length,
	};
};

async function canSyncWorkspace(): Promise<boolean> {
	const { canSyncMail } = await access("canSyncMail");
	return canSyncMail;
}

export const backfillMailboxes = async (
	identityId: string,
	workspaceId: string,
) => {
	if (!(await canSyncWorkspace())) {
		console.info(
			`[backfill:${identityId}] mail sync disabled for workspace ${workspaceId}`,
		);
		return;
	}

	// const { smtpQueue, smtpEvents } = await getRedis();
	const { imapDiscoveryQueue, imapDiscoveryEvents } = await getRedis();
	const job = await imapDiscoveryQueue.add(
		"imap:backfill-discover",
		{ identityId, workspaceId },
		{
			jobId: `imap-backfill-discover-${identityId}`,
			removeOnComplete: true,
			removeOnFail: true,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 1000,
			},
		},
	);
	await job.waitUntilFinished(imapDiscoveryEvents);
	await backfillAccount(identityId, workspaceId);
};

export const backfillGoogleMailboxes = async (
	identityId: string,
	workspaceId: string,
) => {
	if (!(await canSyncWorkspace())) {
		console.info(
			`[backfill:${identityId}] mail sync disabled for workspace ${workspaceId}`,
		);
		return;
	}

	const { gmailQueue, gmailEvents } = await getRedis();

	const job = await gmailQueue.add(
		"gmail:backfill-discover",
		{ identityId, workspaceId },
		{
			jobId: `gmail-backfill-discover-${identityId}`,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 1000,
			},
			removeOnComplete: true,
			removeOnFail: true,
		},
	);

	await job.waitUntilFinished(gmailEvents);

	await gmailQueue.add(
		"gmail:backfill-account",
		{ identityId, workspaceId },
		{
			jobId: `gmail-backfill-account-${identityId}`,
			removeOnComplete: true,
			removeOnFail: false,
		},
	);
};

export const backfillAccount = async (
	identityId: string,
	workspaceId: string,
) => {
	const { smtpQueue, imapBackfillQueue } = await getRedis();
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
	await imapBackfillQueue.add(
		"imap:backfill-account",
		{ identityId },
		{
			removeOnComplete: true,
			removeOnFail: true,
			jobId: `imap-backfill-account-${identityId}`,
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

export async function setReadStatus(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const threadIds = formData.getAll("threadId").map(String).filter(Boolean);
		const mailboxId = String(formData.get("mailboxId") ?? "");
		const op = String(formData.get("op") ?? "");

		if (!threadIds.length || !mailboxId) {
			throw new Error("Missing thread or mailbox");
		}

		if (op !== "read" && op !== "unread") {
			throw new Error("Invalid read operation");
		}

		const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

		await Promise.all(
			threadIds.map(async (threadId) => {
				const job = await mailInteractiveQueue.add(
					"mail:set-flags",
					{ threadId, mailboxId, op },
					{
						attempts: 3,
						backoff: { type: "exponential", delay: 1500 },
						removeOnComplete: true,
						removeOnFail: false,
					},
				);

				await job.waitUntilFinished(mailInteractiveEvents);
			}),
		);

		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);

		return { success: true };
	});
}

export const moveToTrash = async (
	threadIds: string | string[],
	mailboxId: string,
	refresh = true,
) => {
	const ids = (Array.isArray(threadIds) ? threadIds : [threadIds])
		.map(String)
		.filter(Boolean);

	if (!ids.length || !mailboxId) return;

	const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

	await Promise.all(
		ids.map(async (threadId) => {
			const job = await mailInteractiveQueue.add(
				"mail:move",
				{
					threadId,
					mailboxId,
					op: "trash",
				},
				{
					attempts: 3,
					backoff: { type: "exponential", delay: 1500 },
					removeOnComplete: true,
					removeOnFail: false,
				},
			);

			await job.waitUntilFinished(mailInteractiveEvents);
		}),
	);

	if (refresh)
		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);
};

export async function trashThreads(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const threadIds = formData.getAll("threadId").map(String).filter(Boolean);
		const mailboxId = String(formData.get("mailboxId") ?? "");

		if (!threadIds.length || !mailboxId) {
			throw new Error("Missing thread or mailbox");
		}

		await moveToTrash(threadIds, mailboxId, true);

		return { success: true };
	});
}

export async function toggleStar(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const { threadId, mailboxId, starred } = decode(formData) as {
			threadId: string;
			mailboxId: string;
			starred: string;
		};

		if (!threadId || !mailboxId) {
			throw new Error("Missing thread or mailbox");
		}

		const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

		const job = await mailInteractiveQueue.add(
			"mail:set-flags",
			{
				threadId,
				mailboxId,
				op: starred === "true" ? "unflag" : "flag",
			},
			{
				attempts: 3,
				backoff: { type: "exponential", delay: 1500 },
				removeOnComplete: true,
				removeOnFail: false,
			},
		);

		await job.waitUntilFinished(mailInteractiveEvents);
		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);

		return { success: true };
	});
}

export async function permanentlyDeleteThreads(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const threadIds = formData.getAll("threadId").map(String).filter(Boolean);
		const mailboxId = String(formData.get("mailboxId") ?? "");

		if (!threadIds.length || !mailboxId) {
			throw new Error("Missing thread or mailbox");
		}

		await deleteForever(threadIds, mailboxId);

		return { success: true };
	});
}

export const fetchMailboxThreads = async (
	identityPublicId: string,
	mailboxSlug: string,
	page: number,
) => {
	const rls = await rlsClient();
	const now = new Date();
	const safePage = page && page > 0 ? page : 1;

	const effectiveActivityAt = sql`
		COALESCE(${mailboxThreads.unsnoozedAt}, ${mailboxThreads.lastActivityAt})
	`;

	const rows = await rls((tx) =>
		tx
			.select({ thread: mailboxThreads })
			.from(mailboxThreads)
			.where(
				and(
					eq(mailboxThreads.identityPublicId, identityPublicId),
					eq(mailboxThreads.mailboxSlug, mailboxSlug),
					or(
						isNull(mailboxThreads.snoozedUntil),
						lte(mailboxThreads.snoozedUntil, now),
					),
				),
			)
			.orderBy(
				desc(effectiveActivityAt),
				desc(mailboxThreads.lastActivityAt),
				desc(mailboxThreads.threadId),
			)
			.offset((safePage - 1) * PAGE_SIZE)
			.limit(PAGE_SIZE),
	);

	return rows.map((r) => r.thread);
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
	refresh = true,
	opts?: { emptyAll?: boolean },
) {
	const user = await isSignedIn();

	if (!user?.id) {
		throw new Error("Unauthorized");
	}

	if (!mailboxId) {
		throw new Error("Mailbox is required");
	}

	const rls = await rlsClient();
	const { emptyAll = false } = opts ?? {};

	const [allowedMailbox] = await rls((tx) =>
		tx
			.select({
				id: mailboxes.id,
				identityId: mailboxes.identityId,
				kind: mailboxes.kind,
			})
			.from(mailboxes)
			.innerJoin(identities, eq(mailboxes.identityId, identities.id))
			.where(eq(mailboxes.id, mailboxId))
			.limit(1),
	);

	if (!allowedMailbox) {
		throw new Error("Mailbox not found or access denied");
	}

	const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

	const jobOptions = {
		attempts: 3,
		backoff: {
			type: "exponential" as const,
			delay: 1500,
		},
		removeOnComplete: true,
		removeOnFail: false,
	};

	if (emptyAll) {
		if (allowedMailbox.kind !== "trash") {
			throw new Error("Only Trash can be emptied");
		}

		const job = await mailInteractiveQueue.add(
			"mail:delete-permanent",
			{
				mailboxId: allowedMailbox.id,
				emptyAll: true,
			},
			jobOptions,
		);

		await job.waitUntilFinished(mailInteractiveEvents);

		if (refresh) {
			revalidatePath(
				"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
				"page",
			);
		}

		return;
	}

	const requestedIds = [
		...new Set(
			(Array.isArray(threadIds) ? threadIds : [threadIds])
				.filter((id): id is string => Boolean(id))
				.map(String),
		),
	];

	if (!requestedIds.length) return;

	const allowedThreads = await rls((tx) =>
		tx
			.select({
				threadId: mailboxThreads.threadId,
			})
			.from(mailboxThreads)
			.where(
				and(
					eq(mailboxThreads.mailboxId, allowedMailbox.id),
					inArray(mailboxThreads.threadId, requestedIds),
				),
			),
	);

	const allowedIds = allowedThreads.map((row) => row.threadId);

	if (allowedIds.length !== requestedIds.length) {
		throw new Error("One or more threads were not found or access was denied");
	}

	const jobs = await Promise.all(
		allowedIds.map((threadId) =>
			mailInteractiveQueue.add(
				"mail:delete-permanent",
				{
					threadId,
					mailboxId: allowedMailbox.id,
				},
				jobOptions,
			),
		),
	);

	await Promise.all(
		jobs.map((job) => job.waitUntilFinished(mailInteractiveEvents)),
	);

	if (refresh) {
		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);
	}
}

export async function addNewMailboxFolder(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const decodedForm = decode(formData);
	const user = await isSignedIn();

	if (!user?.id) {
		return { success: false, error: "Unauthorized" };
	}

	const name = String(decodedForm.name ?? "").trim();
	const identityId = String(decodedForm.identityId ?? "");
	const parentId =
		decodedForm.parentId && decodedForm.parentId !== "none"
			? String(decodedForm.parentId)
			: null;

	if (!name) {
		return {
			success: false,
			error: "mailbox.folderNameRequired",
		};
	}

	const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

	const job = await mailInteractiveQueue.add(
		"mailbox:add-new",
		{
			name,
			parentId,
			identityId,
		},
		{
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
			removeOnComplete: true,
			removeOnFail: true,
		},
	);

	await job.waitUntilFinished(mailInteractiveEvents);

	revalidatePath(
		"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
		"page",
	);

	return { success: true };
}

export async function deleteMailboxFolder({
	identityId,
	mailboxId,
}: {
	identityId: string;
	mailboxId: string;
}): Promise<FormState> {
	const user = await isSignedIn();

	if (!user?.id) {
		return { success: false, error: "Unauthorized" };
	}

	const [identity] = await db
		.select({ id: identities.id })
		.from(identities)
		.where(eq(identities.publicId, identityId))
		.limit(1);

	if (!identity) {
		return { success: false, error: "Identity not found" };
	}

	const [mailbox] = await db
		.select({
			id: mailboxes.id,
			identityId: mailboxes.identityId,
		})
		.from(mailboxes)
		.where(
			and(eq(mailboxes.id, mailboxId), eq(mailboxes.identityId, identity.id)),
		)
		.limit(1);

	if (!mailbox) {
		return { success: false, error: "Folder not found" };
	}

	const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

	const job = await mailInteractiveQueue.add(
		"mailbox:delete-folder",
		{
			mailboxId,
			identityId: identity.id,
		},
		{
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
			removeOnComplete: true,
			removeOnFail: true,
		},
	);

	await job.waitUntilFinished(mailInteractiveEvents);

	revalidatePath(
		"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
		"page",
	);
	return { success: true };
}

export async function moveToFolder(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const threadIds = formData.getAll("threadId").map(String).filter(Boolean);
		const fromMailboxId = String(formData.get("fromMailboxId") ?? "");
		const toMailboxId = String(formData.get("toMailboxId") ?? "");

		if (!threadIds.length || !fromMailboxId || !toMailboxId) {
			throw new Error("Missing thread or mailbox");
		}

		if (fromMailboxId === toMailboxId) {
			throw new Error("Source and destination mailboxes are the same");
		}

		const { mailInteractiveQueue, mailInteractiveEvents } = await getRedis();

		const jobs = await Promise.all(
			threadIds.map((threadId) =>
				mailInteractiveQueue.add("mail:move", {
					threadId,
					mailboxId: fromMailboxId,
					op: "move",
					toMailboxId,
				}),
			),
		);

		await Promise.all(
			jobs.map((job) => job.waitUntilFinished(mailInteractiveEvents)),
		);

		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);

		return { success: true };
	});
}

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

	return rows;
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
					eq(draftMessages.identityId, identity.id),
				),
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
				.where(eq(draftMessages.id, String(decodedForm.draftId)));
		});

		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);
		return { success: true };
	});
}

export async function snoozeThread(input: {
	mailboxThreadId: string;
	activeMailboxId: string;
	snoozedUntil: string | null;
}) {
	return handleAction(async () => {
		const { mailboxThreadId, activeMailboxId, snoozedUntil } = input;

		const rls = await rlsClient();
		await rls(async (tx) => {
			return tx
				.update(mailboxThreads)
				.set({
					snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null,
					unsnoozedAt: snoozedUntil ? null : new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(mailboxThreads.threadId, mailboxThreadId),
						eq(mailboxThreads.mailboxId, activeMailboxId),
					),
				)
				.returning();
		});

		revalidatePath(
			"/[locale]/w/[workspacePublicId]/dashboard/mail/[identityPublicId]",
			"page",
		);
		return { success: true };
	});
}

export const fetchIdentitySnoozedThreads = async (): Promise<{
	threads: MailboxThreadEntity[];
}> => {
	const rls = await rlsClient();
	const now = new Date();

	const rows = await rls((tx) =>
		tx
			.select({
				thread: mailboxThreads,
			})
			.from(mailboxThreads)
			.where(
				and(
					isNotNull(mailboxThreads.snoozedUntil),
					gt(mailboxThreads.snoozedUntil, now),
				),
			)
			.orderBy(
				desc(mailboxThreads.snoozedUntil),
				desc(mailboxThreads.lastActivityAt),
			),
	);

	return {
		threads: rows.map((r) => r.thread),
	};
};

function subscriptionKeyFromHeadersJson(headersJson: any) {
	const list = headersJson?.list ?? null;
	const rawListId = String(headersJson?.["list-id"] ?? "").trim() || null;

	let unsubscribeHttpUrl: string | null = null;

	const fromList = list?.unsubscribe?.url || list?.unsubscribe?.href;
	if (typeof fromList === "string" && fromList) unsubscribeHttpUrl = fromList;

	const fromHeader = headersJson?.["list-unsubscribe"];
	if (!unsubscribeHttpUrl && typeof fromHeader === "string") {
		const parts = fromHeader
			.split(",")
			.map((s: string) => s.trim().replace(/^<|>$/g, ""));
		const http = parts.find((p: string) => /^https?:/i.test(p));
		if (http) unsubscribeHttpUrl = http;
	}

	if (rawListId) {
		const cleaned = rawListId
			.replace(/^<|>$/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();
		return cleaned ? `list-id:${cleaned}` : null;
	}

	if (unsubscribeHttpUrl) {
		try {
			const u = new URL(unsubscribeHttpUrl);
			const p = (u.pathname || "/").replace(/\/+$/, "") || "/";
			return `${u.protocol}//${u.host.toLowerCase()}${p}`;
		} catch {
			return null;
		}
	}

	return null;
}

export async function fetchThreadMailSubscriptions(opts: {
	ownerId: string;
	messages: Array<{ id: string; headersJson: any }>;
}) {
	const keysByMessageId = new Map<string, string>();

	for (const m of opts.messages) {
		const key = subscriptionKeyFromHeadersJson(m.headersJson);
		if (key) keysByMessageId.set(m.id, key);
	}

	const uniqueKeys = Array.from(new Set(keysByMessageId.values()));
	if (!uniqueKeys.length) {
		return { byMessageId: new Map<string, any>(), keysByMessageId };
	}

	const rows = await db
		.select()
		.from(mailSubscriptions)
		.where(
			and(
				eq(mailSubscriptions.ownerId, opts.ownerId),
				inArray(mailSubscriptions.subscriptionKey, uniqueKeys),
			),
		);

	const byKey = new Map(rows.map((r) => [r.subscriptionKey, r]));
	const byMessageId = new Map<string, any>();

	for (const [messageId, key] of keysByMessageId.entries()) {
		byMessageId.set(messageId, byKey.get(key) ?? null);
	}

	return { byMessageId, keysByMessageId };
}

export type FetchThreadMailSubsResult = Awaited<
	ReturnType<typeof fetchThreadMailSubscriptions>
>;

export async function oneClickUnsubscribe(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData);
		const id = String(decodedForm.mailSubscriptionId);
		const [sub] = await db
			.select()
			.from(mailSubscriptions)
			.where(and(eq(mailSubscriptions.id, id)))
			.limit(1);
		if (!sub?.unsubscribeHttpUrl)
			return { success: false, error: "mailbox.subscriptionNotFound" };
		await fetch(sub.unsubscribeHttpUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: "List-Unsubscribe=One-Click",
			redirect: "follow",
		});
		await db
			.update(mailSubscriptions)
			.set({
				status: "unsubscribed",
				unsubscribedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(mailSubscriptions.id, id));
		revalidatePath(String(decodedForm.pathname));
		return { success: true };
	});
}
