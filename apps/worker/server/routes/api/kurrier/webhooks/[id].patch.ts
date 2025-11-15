import { defineEventHandler, getRouterParam, readBody } from "h3";
import { apiSuccess, apiError, validateApiKey } from "../../../../../lib/api-helpers";
import { db, WebhookInsertEntity, webhooks, WebhookUpdateSchema } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const { ownerId } = await validateApiKey(event);
    const id = getRouterParam(event, "id");

    if (!id) {
        return apiError(400, "INVALID_WEBHOOK_ID", "Webhook id is required");
    }

    const body = await readBody(event).catch(() => ({}));
    const parsed = WebhookUpdateSchema.safeParse(body);

    if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code,
        }));

        return apiError(400, "INVALID_REQUEST_BODY", "Invalid request body", issues);
    }

    const updates = parsed.data;

    const [existing] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, String(id)));

    if (!existing) {
        return apiError(404, "WEBHOOK_NOT_FOUND", "Webhook not found");
    }

    if (existing.ownerId !== ownerId) {
        return apiError(403, "FORBIDDEN", "You do not own this webhook");
    }

    const [updated] = await db
        .update(webhooks)
        .set(updates as WebhookInsertEntity)
        .where(eq(webhooks.id, String(id)))
        .returning();

    return apiSuccess(updated);
});
