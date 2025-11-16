import { defineEventHandler } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import { db, webhooks } from "@db";

export default defineEventHandler(async (event) => {
	await validateApiKey(event);
	const webhooksList = await db.select().from(webhooks);
	return apiSuccess(webhooksList);
});
