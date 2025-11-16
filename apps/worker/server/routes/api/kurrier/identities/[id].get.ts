import { defineEventHandler, getRouterParam } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import { db, identities } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	await validateApiKey(event);
	const id = getRouterParam(event, "id");
	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, String(id)));
	return apiSuccess(identity);
});
