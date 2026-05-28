import { defineEventHandler } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import { db, webhooks } from "@db";
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {

	const { ownerId } = await validateApiKey(event);
	const webhooksList = await db
		.select()
		.from(webhooks)
		.where(eq(webhooks.ownerId, ownerId));
	return apiSuccess(webhooksList);

});
