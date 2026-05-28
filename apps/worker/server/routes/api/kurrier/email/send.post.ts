import { createError, defineEventHandler } from "h3";
import { EmailSendSchema } from "@schema";
import { db, mailboxes } from "@db";
import { and, eq } from "drizzle-orm";
import { getRedis } from "../../../../../lib/get-redis";
import { createSupabaseServiceClient } from "../../../../../lib/create-client-ssr";
import {
	apiSuccess,
	validateApiKey, validateIdentityOwnership,
	validateJSONBody,
} from "../../../../../lib/api-helpers";
import { extension } from "mime-types";
import { base64ToBlob } from "@common";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const { json } = await validateJSONBody(event);

	const parsed = EmailSendSchema.safeParse(json);

	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));

		throw createError({
			statusCode: 400,
			statusMessage: "Invalid request body",
			data: { issues },
		});
	}

	const data = parsed.data;
	const identity = await validateIdentityOwnership({identityId: data.identityId, ownerId: ownerId});
	const id = crypto.randomUUID();
	if (!identity) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid identityId",
		});
	}

	const [sentMailbox] = await db
		.select()
		.from(mailboxes)
		.where(
			and(
				eq(mailboxes.identityId, data.identityId),
				eq(mailboxes.slug, "sent"),
			),
		);

	if (!sentMailbox) {
		throw createError({
			statusCode: 400,
			statusMessage: "Sent mailbox not found for the given identityId",
		});
	}

	const payload = {
		...data,
		newMessageId: id,
		messageMailboxId: "",
		sentMailboxId: String(sentMailbox.id),
		mailboxId: String(sentMailbox.id),
		mode: "compose"
	} as any;

	const supabase = await createSupabaseServiceClient();
	const attachments = [];
	for (const file of data?.attachments || []) {
		const path = `private/${identity.ownerId}/${payload.newMessageId}/${crypto.randomUUID()}.${extension(file.contentType)}`;
		const blob = base64ToBlob(file.content, file.contentType);

		const { error: e } = await supabase.storage
			.from("attachments")
			.upload(path, blob);

		if (!e) {
			attachments.push({
				path,
				messageId: payload.newMessageId,
				bucketId: "attachments",
				filenameOriginal: file.filename,
				contentType: file.contentType,
			});
		}
	}

	payload.attachments = JSON.stringify(attachments);
	const { sendMailQueue } = await getRedis();
	await sendMailQueue.add("send-and-reconcile", payload);

	return apiSuccess({ messageId: payload.newMessageId });
});
