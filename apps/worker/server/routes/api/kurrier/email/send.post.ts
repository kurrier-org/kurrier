import { createError, defineEventHandler } from "h3";
import {EmailSendSchema, getServerEnv} from "@schema";
import { db, mailboxes } from "@db";
import { and, eq } from "drizzle-orm";
import { getRedis } from "../../../../../lib/get-redis";
import { s3 } from "../../../../../lib/create-s3-client";
import {
	apiSuccess,
	validateApiKey, validateIdentityOwnership,
	validateJSONBody,
} from "../../../../../lib/api-helpers";
import { extension } from "mime-types";
import {PutObjectCommand} from "@aws-sdk/client-s3";

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

	const { S3_BUCKET } = getServerEnv();

	const attachments = [];

	for (const file of data?.attachments || []) {
		const ext = extension(file.contentType) || "dat";
		const path = `private/${identity.ownerId}/${payload.newMessageId}/${crypto.randomUUID()}.${ext}`;

		const buffer = Buffer.from(file.content, "base64");

		await s3.send(
			new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: path,
				Body: buffer,
				ContentType: file.contentType,
			}),
		);

		attachments.push({
			path,
			messageId: payload.newMessageId,
			bucketId: S3_BUCKET,
			filenameOriginal: file.filename,
			contentType: file.contentType,
			sizeBytes: buffer.length,
		});
	}

	payload.attachments = JSON.stringify(attachments);
	const { sendMailQueue } = await getRedis();
	await sendMailQueue.add("send-and-reconcile", payload);

	return apiSuccess({ messageId: payload.newMessageId });
});
