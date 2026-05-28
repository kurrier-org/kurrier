import { defineEventHandler } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import { db, identities } from "@db";
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {

	const { ownerId } = await validateApiKey(event);
	const identitiesList = await db
		.select()
		.from(identities)
		.where(eq(identities.ownerId, ownerId));
	return apiSuccess(identitiesList);

});
