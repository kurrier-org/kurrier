import { defineEventHandler, getRouterParam } from "h3";
import {
	apiSuccess,
	apiError,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import { db, webhooks } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");

	if (!id) {
		return apiError(400, "INVALID_WEBHOOK_ID", "Webhook id is required");
	}

	const [existing] = await db
		.select()
		.from(webhooks)
		.where(eq(webhooks.id, String(id)));

	if (!existing) {
		return apiError(404, "WEBHOOK_NOT_FOUND", "Webhook not found");
	}

	if (existing.ownerId !== ownerId) {
		return apiError(403, "FORBIDDEN", "You do not own this webhook");
	}

	await db.delete(webhooks).where(eq(webhooks.id, String(id)));

	return apiSuccess({
		id: existing.id,
		deleted: true,
	});
});
