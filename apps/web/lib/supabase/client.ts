import { createBrowserClient } from "@supabase/ssr";
import { PublicConfig } from "@schema";

export function createClient(publicConfig: PublicConfig) {
	return createBrowserClient(
		publicConfig.SUPABASE_PUBLIC_URL,
		publicConfig.ANON_KEY,
	);
}
