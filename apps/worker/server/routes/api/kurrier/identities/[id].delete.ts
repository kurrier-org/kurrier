import { defineEventHandler, getRouterParam } from "h3";
import {
	apiSuccess,
	apiError,
	validateApiKey, validateIdentityOwnership,
} from "../../../../../lib/api-helpers";
import { db, identities } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");

	if (!id) {
		return apiError(400, "INVALID_IDENTITY_ID", "Identity id is required");
	}

	const existing = await validateIdentityOwnership({
		identityId: String(id),
		ownerId,
	});

	await db.delete(identities).where(eq(identities.id, existing.id));

	return apiSuccess({
		id: existing.id,
		deleted: true,
	});
});
