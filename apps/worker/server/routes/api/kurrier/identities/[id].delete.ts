import { defineEventHandler, getRouterParam } from "h3";
import {
	apiSuccess,
	apiError,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import { db, identities } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");

	if (!id) {
		return apiError(400, "INVALID_IDENTITY_ID", "Identity id is required");
	}

	const [existing] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, String(id)));

	if (!existing) {
		return apiError(404, "IDENTITY_NOT_FOUND", "Identity not found");
	}

	if (existing.ownerId !== ownerId) {
		return apiError(403, "FORBIDDEN", "You do not own this identity");
	}

	await db.delete(identities).where(eq(identities.id, String(id)));

	return apiSuccess({
		id: existing.id,
		deleted: true,
	});
});
