import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@schema";

export async function createClient() {
	const cookieStore = await cookies();
	const {
		public: { SUPABASE_PUBLIC_URL },
		server: { SERVICE_ROLE_KEY },
	} = getEnv();

	return createServerClient(SUPABASE_PUBLIC_URL, SERVICE_ROLE_KEY, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options),
					);
				} catch {
					// The `setAll` method was called from a Server Component.
					// This can be ignored if you have middleware refreshing
					// user sessions.
				}
			},
		},
	});
}
