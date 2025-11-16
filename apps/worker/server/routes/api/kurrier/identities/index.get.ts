import { defineEventHandler } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import { db, identities } from "@db";

export default defineEventHandler(async (event) => {
	await validateApiKey(event);
	const identitiesList = await db.select().from(identities);
	return apiSuccess(identitiesList);
});
