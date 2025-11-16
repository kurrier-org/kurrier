import { defineEventHandler, readBody } from "h3";
import {
	apiSuccess,
	apiError,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import { db, WebhookCreateSchema, WebhookInsertEntity, webhooks } from "@db";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);

	const body = await readBody(event).catch(() => ({}));
	const parsed = WebhookCreateSchema.safeParse(body);

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

	const data = parsed.data;
	if (!data.url) {
		return apiError(400, "MISSING_URL", "Field `url` is required");
	}

	if (!data.events || data.events.length === 0) {
		return apiError(
			400,
			"MISSING_EVENTS",
			"Field `events` must have at least one event",
		);
	}

	const insertPayload = {
		ownerId,
		url: data.url,
		description: data.description ?? null,
		enabled: data.enabled ?? true,
		identityId: data.identityId ?? null,
		events: data.events,
		metaData: data.metaData ?? null,
	};

	const [created] = await db
		.insert(webhooks)
		.values(insertPayload as WebhookInsertEntity)
		.returning();

	return apiSuccess(created);
});
