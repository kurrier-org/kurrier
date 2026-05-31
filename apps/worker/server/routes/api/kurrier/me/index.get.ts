import { defineEventHandler } from "h3";
import {
	apiError,
	apiSuccess,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import {db, users} from "@db";
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const [user] = await db.select().from(users).where(
		eq(users.id, ownerId)
	)
	if (!user) {
		return apiError(404, "USER_NOT_FOUND", "User not found");
	}

	return apiSuccess({
		id: user?.id,
		email: user?.email,
	});
});
