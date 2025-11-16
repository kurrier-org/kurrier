import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@schema";

export async function createSupabaseServiceClient() {
	const {
		public: { API_URL },
		server: { SERVICE_ROLE_KEY },
	} = getEnv();

	return createClient(API_URL, SERVICE_ROLE_KEY);
}
