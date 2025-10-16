import { defineNitroPlugin } from "nitropack/runtime";
import {
	AddressObjectJSON,
	ComposeMode,
	getPublicEnv,
	getServerEnv,
	MailComposeInput,
} from "@schema";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import { generateSnippet, upsertMailboxThreadItem } from "@common";
const serverConfig = getServerEnv();
const publicConfig = getPublicEnv();
import IORedis from "ioredis";
import { Worker } from "bullmq";
import {
	db,
	decryptAdminSecrets,
	identities,
	mailboxes,
	MessageAttachmentInsertSchema,
	messageAttachments,
	MessageCreate,
	MessageInsertSchema,
	messages,
	providers,
	providerSecrets,
	smtpAccounts,
	smtpAccountSecrets,
	threads,
} from "@db";
import { createMailer } from "@providers";
import { toArray } from "drizzle-orm/mysql-core";
import { eq } from "drizzle-orm";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
const supabase = createClient(
	publicConfig.API_URL,
	serverConfig.SERVICE_ROLE_KEY,
);
import addressparser from "addressparser";
import { PgTransaction } from "drizzle-orm/pg-core";
import { getRedis } from "../../lib/get-redis";
const connection = new IORedis({
	maxRetriesPerRequest: null,
	password: serverConfig.REDIS_PASSWORD,
	host: serverConfig.REDIS_HOST || "redis",
	port: Number(serverConfig.REDIS_PORT || 6379),
});

type AttachmentDownload = {
	item: ReturnType<typeof MessageAttachmentInsertSchema.parse>;
	blob: Blob;
	name: string;
	sizeBytes: number;
	contentType?: string;
};

export default defineNitroPlugin(async (nitroApp) => {
	const worker = new Worker(
		"send-mail",
		async (job) => {
			if (job.name === "send-and-reconcile") {
				await send(job.data);
				return { success: true };
			}
			return { success: true };
		},
		{ connection },
	);

	worker.on("completed", (job) => {
		console.log(`[send-mail] ${job.id} completed`);
	});
	worker.on("failed", (job, err) => {
		console.error(`[send-mail] ${job?.id} failed: ${err?.message}`);
	});

	const getOriginalMessage = async (decodedForm: Record<any, any>) => {
		const [message] = await db
			.select({
				message: messages,
				mailbox: mailboxes,
				identity: identities,
				provider: providers,
				smtpAccount: smtpAccounts,
			})
			.from(messages)
			.leftJoin(mailboxes, eq(messages.mailboxId, mailboxes.id))
			.leftJoin(identities, eq(mailboxes.identityId, identities.id))
			.leftJoin(providers, eq(identities.providerId, providers.id))
			.leftJoin(smtpAccounts, eq(identities.smtpAccountId, smtpAccounts.id))
			.where(eq(messages.id, String(decodedForm.originalMessageId)));

		return message;
	};

	type GetOriginalMessageType = Awaited<ReturnType<typeof getOriginalMessage>>;

	async function ensureThreadId(ownerId: string, tx: PgTransaction<any>) {
		const [t] = await tx
			.insert(threads)
			.values({
				ownerId,
				lastMessageDate: new Date(),
			})
			.returning({ id: threads.id });
		return t.id;
	}

	function toAddressObj(
		input: string | string[] | null | undefined,
	): AddressObjectJSON {
		const str = Array.isArray(input) ? input.join(",") : input || "";
		const parsed = addressparser(str);
		const value = parsed.map((p) => ({
			address: p.address || null,
			name: p.name || "",
		}));
		const joined = value
			.map((v: { name: any; address: any }) =>
				v.name ? `${v.name} <${v.address ?? ""}>` : (v.address ?? ""),
			)
			.join(", ");
		return { value, html: joined, text: joined };
	}

	const send = async (decodedForm: Record<any, unknown>) => {
		return await db.transaction(async (tx) => {
			const [mailbox] = await tx
				.select({
					mailbox: mailboxes,
					identity: identities,
					provider: providers,
					smtp: smtpAccounts,
				})
				.from(mailboxes)
				.leftJoin(identities, eq(mailboxes.identityId, identities.id))
				.leftJoin(providers, eq(identities.providerId, providers.id))
				.leftJoin(smtpAccounts, eq(identities.smtpAccountId, smtpAccounts.id))
				.where(eq(mailboxes.id, String(decodedForm.sentMailboxId)));

			if (!mailbox) {
				throw new Error("Mailbox not found");
			}

			const [secrets] = mailbox.identity.providerId
				? await decryptAdminSecrets({
						linkTable: providerSecrets,
						foreignCol: providerSecrets.providerId,
						secretIdCol: providerSecrets.secretId,
						ownerId: mailbox.identity.ownerId,
						parentId: String(mailbox.identity.providerId),
					})
				: await decryptAdminSecrets({
						linkTable: smtpAccountSecrets,
						foreignCol: smtpAccountSecrets.accountId,
						secretIdCol: smtpAccountSecrets.secretId,
						ownerId: mailbox.identity.ownerId,
						parentId: String(mailbox.identity.smtpAccountId),
					});

			const credentials = secrets?.vault?.decrypted_secret
				? JSON.parse(secrets.vault.decrypted_secret)
				: {};

			const mailer = createMailer(
				mailbox.provider ? mailbox.provider.type : "smtp",
				credentials,
			);

			const attachmentBlobs = await fetchAttachmentBlobs(
				supabase,
				decodedForm.attachments as string,
			);

			const data: MailComposeInput = {
				messageId: String(decodedForm.messageId ?? ""),
				to: toArray(decodedForm.to as any),
				cc: toArray(decodedForm.cc as any),
				bcc: toArray(decodedForm.bcc as any),
				subject: (decodedForm.subject as string) || undefined,
				text: (decodedForm.text as string) || undefined,
				html: (decodedForm.html as string) || undefined,
				mode: (decodedForm.mode as ComposeMode) || "new",
			};

			let origRow: GetOriginalMessageType | null = null;
			if (
				(data.mode === "reply" || data.mode === "forward") &&
				decodedForm.originalMessageId
			) {
				origRow = await getOriginalMessage(decodedForm);
			}

			const { subject, text, html } = await generateMailAttrs({
				data,
				orig: origRow,
			});

			const mailboxIdForMessage = String(decodedForm.sentMailboxId);

			let threadIdForMessage: string;

			if (data.mode === "reply") {
				if (!origRow?.message) throw new Error("Original message not found");
				threadIdForMessage = origRow.message.threadId;
			} else {
				threadIdForMessage = await ensureThreadId(
					mailbox.identity.ownerId,
					tx as PgTransaction<any>,
				);
			}

			const inReplyTo =
				data.mode === "reply" && origRow?.message
					? origRow.message.messageId
					: null;

			const references =
				data.mode === "reply" && origRow?.message
					? Array.from(
							new Set(
								[
									...(Array.isArray(origRow.message.references)
										? origRow.message.references
										: []),
									origRow.message.messageId ?? null,
								].filter(Boolean),
							),
						).slice(-30)
					: [];

			const newMessageBody = MessageInsertSchema.parse({
				mailboxId: mailboxIdForMessage,
				threadId: threadIdForMessage,
				messageId: "PLACEHOLDER",
				inReplyTo: inReplyTo ?? undefined,
				references,
				hasAttachments: attachmentBlobs.length > 0,
				to: toAddressObj(data.to || []),
				from: mailbox.identity.value,
				cc: toAddressObj(data?.cc || []),
				bcc: toAddressObj(data.bcc || []),
				snippet: generateSnippet(text || html || ""),
				subject,
				text,
				html,
				ownerId: mailbox.identity.ownerId,
				seen: true,
			});

			const mailerResponse = await mailer.sendEmail(data.to, {
				from: mailbox.identity.value,
				subject: String(newMessageBody.subject),
				text: newMessageBody.text ?? "",
				html: newMessageBody.html ?? "",
				inReplyTo: inReplyTo ?? "",
				references: references,
				attachments: attachmentBlobs.map((att) => ({
					name: att.name,
					content: att.blob,
					contentType: String(att.item.contentType),
				})),
			});

			if (mailerResponse.success) {
				const parsedMessage = MessageInsertSchema.parse({
					...newMessageBody,
					messageId: String(mailerResponse.MessageId) || `msg-${Date.now()}`,
				});

				const [newMessage] = await tx
					.insert(messages)
					.values(parsedMessage as MessageCreate)
					.returning();

				for (const attachmentBlob of attachmentBlobs) {
					await tx.insert(messageAttachments).values({
						...attachmentBlob.item,
						ownerId: newMessage.ownerId,
						messageId: newMessage.id,
					});
				}

				await upsertMailboxThreadItem(newMessage.id, tx);

				const { searchIngestQueue } = await getRedis();
				await searchIngestQueue.add(
					"add",
					{ messageId: newMessage.id },
					{ removeOnComplete: true },
				);
			} else if (mailerResponse.error) {
				return {
					success: false,
					error: `Failed to send email: ${mailerResponse.error}`,
				};
			}
			return { success: true };
		});
	};

	const generateMailAttrs = async ({
		data,
		orig,
	}: {
		data: MailComposeInput;
		orig: GetOriginalMessageType | null;
	}) => {
		if (!orig) {
			return {
				subject: data.subject ?? "(no subject)",
				text: data.text ?? "",
				html: data.html ?? "",
			};
		}
		const isReply = data.mode === "reply";
		const isForward = data.mode === "forward";
		const hasOrig = Boolean(orig?.message);

		const origMsg = orig?.message ?? null;

		const fromNameStr = hasOrig ? getMessageName(origMsg!, "from") || "" : "";
		const fromAddrStr = hasOrig
			? getMessageAddress(origMsg!, "from") || ""
			: "";

		// Prefer RFC822 Date, then createdAt, else empty
		const rawDate: Date | null =
			hasOrig && (origMsg!.date ?? origMsg!.createdAt)
				? (origMsg!.date ?? origMsg!.createdAt)!
				: null;

		// Human-friendly fallback
		const origDateLabel = rawDate
			? new Date(rawDate).toLocaleString(undefined, {
					year: "numeric",
					month: "short",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
				})
			: "";

		const origHtml = hasOrig ? origMsg!.html || origMsg!.textAsHtml || "" : "";
		const origText = hasOrig ? origMsg!.text || "" : "";

		// Subject
		const baseSubj = (data.subject ?? "").trim();
		let subject = baseSubj;
		if (isReply && hasOrig) {
			const s = (origMsg!.subject ?? "").trim();
			subject = s.startsWith("Re:") ? s : `Re: ${s || "(no subject)"}`;
		} else if (isForward && hasOrig) {
			const s = (origMsg!.subject ?? "").trim();
			subject = s.startsWith("Fwd:") ? s : `Fwd: ${s || "(no subject)"}`;
		} else if (!baseSubj) {
			subject = "(no subject)";
		}

		// Quoted blocks (only with original)
		const quotedText = hasOrig
			? `On ${origDateLabel}, ${fromNameStr} <${fromAddrStr}> wrote:\n${origText}`
			: "";

		const quotedHtml = hasOrig
			? `<hr>
<p>On ${origDateLabel}, ${fromNameStr} &lt;${fromAddrStr}&gt; wrote:</p>
<blockquote style="border-left:2px solid #ccc;margin:0;padding-left:8px;">
  ${origHtml || `<pre style="white-space:pre-wrap;margin:0;">${origText}</pre>`}
</blockquote>`
			: "";

		// Bodies
		const text = isReply
			? `${data.text ?? ""}${hasOrig ? `\n\n${quotedText}` : ""}`
			: isForward
				? `${data.text ?? ""}${hasOrig ? `\n\nForwarded message:\n${quotedText}` : ""}`
				: (data.text ?? "");

		const html = isReply
			? `${data.html ?? ""}${quotedHtml}`
			: isForward
				? `${data.html ?? ""}${hasOrig ? `<p>Forwarded message:</p>${quotedHtml}` : ""}`
				: (data.html ?? ""); // for "new", don't auto-pull orig html

		return { subject, text, html };
	};

	async function fetchAttachmentBlobs(
		supabase: SupabaseClient,
		attachmentsString: string,
	): Promise<AttachmentDownload[]> {
		let attachments: unknown = [];
		try {
			attachments = attachmentsString ? JSON.parse(attachmentsString) : [];
		} catch {
			return [];
		}

		const list = Array.isArray(attachments) ? attachments : [];
		const candidates = list.filter((a: any) => a && a.bucketId && a.path);

		if (candidates.length === 0) return [];

		try {
			const downloads = await Promise.all(
				candidates.map(async (attachment: any): Promise<AttachmentDownload> => {
					const { data: blob, error } = await supabase.storage
						.from(String(attachment.bucketId))
						.download(String(attachment.path));

					if (error || !blob) {
						throw new Error(
							`Failed to download "${attachment.path}": ${error?.message ?? "unknown error"}`,
						);
					}

					const sizeBytes = Number(attachment.sizeBytes ?? blob.size);

					const item = MessageAttachmentInsertSchema.parse(attachment);

					return {
						item,
						blob,
						name: String(attachment.filenameOriginal || "attachment"),
						sizeBytes,
						// contentType,
					};
				}),
			);

			return downloads;
		} catch (e) {
			console.error("fetchAttachmentBlobs error:", e);
			return [];
		}
	}

	nitroApp.hooks.hookOnce("close", async () => {
		console.log("Closing nitro server...");
		console.log("Task is done!");
	});
});
