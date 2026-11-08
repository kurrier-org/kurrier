import { db, WebhookUpdateSchema, webhooks } from "@db";
import { and, eq } from "drizzle-orm";
import { defineEventHandler, getRouterParam, readBody } from "h3";
import {
	apiError,
	apiSuccess,
	validateApiKey,
	validateIdentityOwnership,
} from "../../../../../lib/api-helpers";

export default defineEventHandler(async (event) => {
	const { apiKey, ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");
	if (!id) {
		return apiError(400, "INVALID_WEBHOOK_ID", "Webhook id is required");
	}
	const body = await readBody(event).catch(() => ({}));
	const parsed = WebhookUpdateSchema.pick({
		url: true,
		description: true,
		enabled: true,
		identityId: true,
		events: true,
		metaData: true,
	}).safeParse(body);
	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));
		return apiError(
			400,
			"INVALID_REQUEST_BODY",
			"Invalid request body",
			issues,
		);
	}
	const scope = and(
		eq(webhooks.id, id),
		eq(webhooks.ownerId, ownerId),
		eq(webhooks.workspaceId, apiKey.workspaceId),
	);
	const [existing] = await db.select().from(webhooks).where(scope).limit(1);
	if (!existing) {
		return apiError(404, "WEBHOOK_NOT_FOUND", "Webhook not found");
	}
	if (Object.keys(parsed.data).length === 0) return apiSuccess(existing);
	if (parsed.data.identityId) {
		await validateIdentityOwnership({
			identityId: parsed.data.identityId,
			ownerId,
			workspaceId: apiKey.workspaceId,
		});
	}
	const [updated] = await db
		.update(webhooks)
		.set(parsed.data)
		.where(scope)
		.returning();
	return apiSuccess(updated);
});
