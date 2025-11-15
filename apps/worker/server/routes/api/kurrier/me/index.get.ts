import { defineEventHandler } from "h3";
import {apiError, apiSuccess, validateApiKey} from "../../../../../lib/api-helpers";
import { createSupabaseServiceClient } from "../../../../../lib/create-client-ssr";

export default defineEventHandler(async (event) => {
    const { ownerId } = await validateApiKey(event);
    const supabase = await createSupabaseServiceClient();
    const { data, error } = await supabase.auth.admin.getUserById(ownerId)
    if (error || !data) {
        return apiError(404, "USER_NOT_FOUND", "User not found");
    }

    return apiSuccess({
        id: data.user?.id,
        email: data.user?.email,
    });
});
