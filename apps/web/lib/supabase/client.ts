import { createBrowserClient } from "@supabase/ssr";
import { PublicConfig } from "@schema";

export function createClient(publicConfig: PublicConfig) {
	return createBrowserClient(publicConfig.API_URL, publicConfig.ANON_KEY);
}
