import { createBrowserClient } from "@supabase/ssr";
import { PublicConfig } from "@schema";

export function createClient(publicConfig: PublicConfig) {
	return createBrowserClient(
		publicConfig.WEB_URL + "/api/kong",
		publicConfig.ANON_KEY,
	);
}
