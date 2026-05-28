import { defineEventHandler, getRouterParam, readBody } from "h3";
import {
	apiSuccess,
	apiError,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import { db, WebhookInsertEntity, webhooks, WebhookUpdateSchema } from "@db";
import {and, eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {

	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");
	if (!id) {
		return apiError(400, "INVALID_WEBHOOK_ID", "Webhook id is required");
	}
	const body = await readBody(event).catch(() => ({}));
	const parsed = WebhookUpdateSchema.safeParse(body);
	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));
		return apiError(400, "INVALID_REQUEST_BODY", "Invalid request body", issues);
	}
	const [existing] = await db
		.select()
		.from(webhooks)
		.where(and(eq(webhooks.id, String(id)), eq(webhooks.ownerId, ownerId)))
		.limit(1);
	if (!existing) {
		return apiError(404, "WEBHOOK_NOT_FOUND", "Webhook not found");
	}
	const [updated] = await db
		.update(webhooks)
		.set(parsed.data as WebhookInsertEntity)
		.where(and(eq(webhooks.id, existing.id), eq(webhooks.ownerId, ownerId)))
		.returning();
	return apiSuccess(updated);

});
