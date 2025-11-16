import { defineEventHandler, getRouterParam, readBody } from "h3";
import {
	apiSuccess,
	apiError,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import { db, identities, IdentityCreate, IdentityUpdateSchema } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");

	if (!id) {
		return apiError(400, "INVALID_IDENTITY_ID", "Webhook id is required");
	}

	const body = await readBody(event).catch(() => ({}));
	const parsed = IdentityUpdateSchema.safeParse(body);

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

	const updates = parsed.data;

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

	const [updated] = await db
		.update(identities)
		.set(updates as IdentityCreate)
		.where(eq(identities.id, String(id)))
		.returning();

	return apiSuccess(updated);
});
