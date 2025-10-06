"use server";

import { cache } from "react";
import { rlsClient } from "@/lib/actions/clients";
import {
    identities,
    mailboxes,
    messageAttachments,
    messages,
    threads, threadsList,
} from "@db";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
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
	await smtpEvents.waitUntilReady();
	await sendMailEvents.waitUntilReady();
	return {
		smtpQueue,
		smtpEvents,
        sendMailQueue,
        sendMailEvents
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

// export const fetchMailboxMessages = cache(async (mailboxId: string) => {
// 	const rls = await rlsClient();
// 	const messageList = await rls((tx) =>
// 		tx
// 			.select()
// 			.from(messages)
// 			.where(eq(messages.mailboxId, mailboxId))
// 			.orderBy(desc(messages.date)),
// 	);
// 	return { messages: messageList };
// });


export const fetchMailboxThreadsList = cache(
    async (
        mailboxId: string,
        threadIds: string[],
    ) => {
        if (!threadIds || threadIds.length === 0) {
            return { threads: [] };
        }

        const rls = await rlsClient();

        const conditions = [eq(threadsList.mailboxId, mailboxId)];
        if (threadIds && threadIds.length > 0) {
            conditions.push(inArray(threadsList.id, threadIds));
        }

        return await rls(async (tx) => {
            return tx
                .select()
                .from(threadsList)
                .where(and(...conditions))
                .orderBy(
                    desc(sql`coalesce(${threadsList.lastActivityAt}, ${threadsList.createdAt})`),
                    desc(threadsList.id), // tie-breaker for stable order
                )
                .limit(50);
        });
    },
);


export const fetchMailboxThreads = cache(
	async (mailboxId: string, page?: number, threadId?: string) => {
		const rls = await rlsClient();
		page = page && page > 0 ? page : 1;

		const conditions = [eq(threads.mailboxId, mailboxId)];
		if (threadId) {
			conditions.push(eq(threads.id, threadId));
		}

		const rows = await rls(async (tx) => {
			// Subquery: newest message timestamp per thread
			const latestSub = tx
				.select({
					threadId: messages.threadId,
					last: sql`max(coalesce(${messages.date}, ${messages.createdAt}))`.as(
						"last",
					),
				})
				.from(messages)
				.groupBy(messages.threadId)
				.as("latest");

			const messageFields = messages;
			delete messageFields.html;
			delete messageFields.text;
			delete messageFields.textAsHtml;
			delete messageFields.headersJson;
			delete messageFields.rawStorageKey;

			return (
				tx
					.select({
						thread: threads,
						message: messageFields,
					})
					.from(threads)
					// Join the per-thread latest timestamp
					.leftJoin(latestSub, eq(latestSub.threadId, threads.id))
					// Keep messages join so you can still collect per-thread messages
					.leftJoin(messages, eq(messages.threadId, threads.id))
					.where(and(...conditions))
					.orderBy(
						// Order threads by newest activity first
						desc(
							sql`coalesce(${latestSub.last}, ${threads.lastMessageDate}, ${threads.createdAt})`,
						),
						// Within a thread, prefer newer messages first (so first row is the newest of that thread)
						desc(sql`coalesce(${messages.date}, ${messages.createdAt})`),
					)
					.offset(threadId ? 0 : (page - 1) * 50)
					.limit(50)
			);
		});

		// Collapse (thread × message) rows into one entry per thread
		const byThread = new Map<string, { thread: any; messages: any[] }>();

		for (const row of rows) {
			const t = row.thread;
			if (!byThread.has(t.id)) {
				byThread.set(t.id, { thread: t, messages: [] });
			}
			if (row.message) {
				byThread.get(t.id)!.messages.push(row.message);
			}
		}

		return { threads: Array.from(byThread.values()) };
	},
);

// export const fetchThreadDetail = cache(
// 	async (
// 		mailboxId: string,
// 		threadId: string,
// 	): Promise<{ thread: any | null; messages: any[] }> => {
// 		const rls = await rlsClient();
//
// 		return rls(async (tx) => {
// 			// 1) Fetch the thread (guarded by mailboxId)
// 			const [thread] = await tx
// 				.select()
// 				.from(threads)
// 				.where(and(eq(threads.mailboxId, mailboxId), eq(threads.id, threadId)))
// 				.limit(1);
//
// 			if (!thread) return { thread: null, messages: [] };
//
// 			const messageFields = messages;
// 			delete messageFields.headersJson;
// 			delete messageFields.rawStorageKey;
//
// 			const msgs = await tx
// 				.select(messageFields)
// 				.from(messages)
// 				.where(eq(messages.threadId, threadId))
// 				.orderBy(desc(sql`coalesce(${messages.date}, ${messages.createdAt})`))
// 				.limit(500); // or whatever cap you prefer
//
// 			return { thread, messages: msgs };
// 		});
// 	},
// );

export type FetchMailboxThreadsResult = Awaited<
	ReturnType<typeof fetchMailboxThreads>
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

// type AttachmentDownload = {
// 	item: ReturnType<typeof MessageAttachmentInsertSchema.parse>;
// 	blob: Blob;
// 	name: string;
// 	sizeBytes: number;
// 	contentType?: string;
// };

// export async function fetchAttachmentBlobs(
// 	supabase: SupabaseClient,
// 	attachmentsString: string,
// ): Promise<AttachmentDownload[]> {
// 	// Parse safely
// 	let attachments: unknown = [];
// 	try {
// 		attachments = attachmentsString ? JSON.parse(attachmentsString) : [];
// 	} catch {
// 		// bad JSON -> no attachments
// 		return [];
// 	}
//
// 	// Normalize & filter
// 	const list = Array.isArray(attachments) ? attachments : [];
// 	const candidates = list.filter((a: any) => a && a.bucketId && a.path);
//
// 	if (candidates.length === 0) return [];
//
// 	try {
// 		const downloads = await Promise.all(
// 			candidates.map(async (attachment: any): Promise<AttachmentDownload> => {
// 				const { data: blob, error } = await supabase.storage
// 					.from(String(attachment.bucketId))
// 					.download(String(attachment.path));
//
// 				if (error || !blob) {
// 					throw new Error(
// 						`Failed to download "${attachment.path}": ${error?.message ?? "unknown error"}`,
// 					);
// 				}
//
// 				const sizeBytes = Number(attachment.sizeBytes ?? blob.size);
//
// 				const item = MessageAttachmentInsertSchema.parse(attachment);
//
// 				return {
// 					item,
// 					blob,
// 					name: String(attachment.filenameOriginal || "attachment"),
// 					sizeBytes,
// 					// contentType,
// 				};
// 			}),
// 		);
//
// 		return downloads;
// 	} catch (e) {
// 		console.error("fetchAttachmentBlobs error:", e);
// 		return [];
// 	}
// }

// const generateMailAttrs = async ({
// 	row,
// 	data,
// }: {
// 	row: RowForProviderResult;
// 	data: MailComposeInput;
// }) => {
// 	const fromNameStr = fromName(row.message);
// 	const fromAddrStr = fromAddress(row.message);
// 	const origHtml = row.message.html || row.message.textAsHtml || "";
// 	const origText = row.message.text || "";
//
// 	const subject =
// 		data.mode === "reply"
// 			? row.message.subject?.startsWith("Re:")
// 				? row.message.subject
// 				: `Re: ${row.message.subject ?? ""}`
// 			: data.mode === "forward"
// 				? row.message.subject?.startsWith("Fwd:")
// 					? row.message.subject
// 					: `Fwd: ${row.message.subject ?? ""}`
// 				: (data.subject ?? "");
//
// 	const quotedText = `On ${row.message.date?.toISOString()}, ${fromNameStr} <${fromAddrStr}> wrote:
// ${origText}`;
//
// 	const quotedHtml = `<hr>
// <p>On ${row.message.date?.toISOString()}, ${fromNameStr} &lt;${fromAddrStr}&gt; wrote:</p>
// <blockquote style="border-left:2px solid #ccc;margin:0;padding-left:8px;">
//   ${origHtml || `<pre style="white-space:pre-wrap;margin:0;">${origText}</pre>`}
// </blockquote>`;
//
// 	const text =
// 		data.mode === "reply"
// 			? `${data.text ?? ""}\n\n${quotedText}`
// 			: data.mode === "forward"
// 				? `${data.text ?? ""}\n\nForwarded message:\n${quotedText}`
// 				: (data.text ?? "");
//
// 	const html =
// 		data.mode === "reply"
// 			? `${data.html ?? ""}${quotedHtml}`
// 			: data.mode === "forward"
// 				? `${data.html ?? ""}<p>Forwarded message:</p>${quotedHtml}`
// 				: (data.html ?? row.message.html ?? "");
//
// 	return { subject, text, html };
// };

// const rowForProvider = async (decodedForm: Record<any, any>) => {
// 	const rls = await rlsClient();
// 	const [row] = await rls((tx) =>
// 		tx
// 			.select({
// 				message: messages,
// 				mailbox: mailboxes,
// 				identity: identities,
// 				provider: providers,
// 				smtpAccount: smtpAccounts,
// 			})
// 			.from(messages)
// 			.leftJoin(mailboxes, eq(messages.mailboxId, mailboxes.id))
// 			.leftJoin(identities, eq(mailboxes.identityId, identities.id))
// 			.leftJoin(providers, eq(identities.providerId, providers.id))
// 			.leftJoin(smtpAccounts, eq(identities.smtpAccountId, smtpAccounts.id))
// 			.where(eq(messages.id, String(decodedForm.originalMessageId))),
// 	);
//
// 	return row;
// };

// type RowForProviderResult = Awaited<ReturnType<typeof rowForProvider>>;

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
	// await deltaQueue.add("delta-fetch", { identityId }, { jobId: `delta-fetch-${identityId}` });
	const job = await smtpQueue.add("delta-fetch", { identityId });
	const result = await job.waitUntilFinished(smtpEvents);
};

export const initSearch = async (
	query: string,
	ownerId: string,
	hasAttachment: boolean,
	onlyUnread: boolean,
	page: number,
): Promise<SearchThreadsResponse> => {
	const client = getTypeSenseClient();

	const filters = [`ownerId:=${JSON.stringify(ownerId)}`];
	if (hasAttachment) filters.push("hasAttachment:=1");
	if (onlyUnread) filters.push("unread:=1");

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
			page: page,
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
			// snippet: (d.text || d.textAsHtml || "")
			//     .toString()
			//     .replace(/\s+/g, " ")
			//     .slice(0, 100),
			fromName: d.fromName ?? null,
			fromEmail: d.fromEmail ?? null,
			participants: Array.isArray(d.participants) ? d.participants : [],
			labels: Array.isArray(d.labels) ? d.labels : [],
			hasAttachment: Number(d.hasAttachment) === 1,
			unread: Number(d.unread) === 1,
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


export const fetchWebMailList = async (identityPublicId: string, mailboxSlug: string, page: number) => {
    page = page && page > 0 ? page : 1;
    const rls = await rlsClient();
    const threads = await rls((tx) => {
        return tx
            .select()
            .from(threadsList)
            .where(and(
                eq(threadsList.identityPublicId, identityPublicId),
                eq(threadsList.mailboxSlug, mailboxSlug),
            ))
            .orderBy(desc(threadsList.lastActivityAt))
            .offset((page - 1) * 50)
            .limit(50)
    })
    return threads
};


export type FetchWebMailResult = Awaited<
    ReturnType<typeof fetchWebMailList>
>;

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
                .orderBy(desc(sql`coalesce(${messages.date}, ${messages.createdAt})`));


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

export type FetchWebMailThreadDetail = Awaited<ReturnType<typeof fetchWebMailThreadDetail>>;
