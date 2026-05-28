import { defineEventHandler, getRouterParam } from "h3";
import {apiError, apiSuccess, validateApiKey} from "../../../../../lib/api-helpers";
import { db, webhooks } from "@db";
import {and, eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {

	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");
	const [webhook] = await db
		.select()
		.from(webhooks)
		.where(
			and(
				eq(webhooks.id, String(id)),
				eq(webhooks.ownerId, ownerId),
			),
		)
		.limit(1);
	if (!webhook) {
		return apiError(404, "WEBHOOK_NOT_FOUND", "Webhook not found");
	}
	return apiSuccess(webhook);

});
