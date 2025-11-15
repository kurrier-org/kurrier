import { defineEventHandler, getRouterParam } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import { db, webhooks } from "@db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    await validateApiKey(event);
    const id = getRouterParam(event, "id");
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id,  String(id)));
    return apiSuccess(webhook);
});
