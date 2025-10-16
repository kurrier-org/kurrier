import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { getEnv } from "@schema";
import { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";

export async function createClient(event: H3Event) {
	const {
		public: { API_URL, ANON_KEY },
	} = getEnv();

	return createServerClient(API_URL, ANON_KEY, {
		cookies: {
			get: (name: string) => getCookie(event, name) ?? "",
			set: (name: string, value: string, options: CookieOptions) =>
				setCookie(event, name, value, { ...options }),
			remove: (name: string, options: CookieOptions) =>
				deleteCookie(event, name, options),
		},
	});
}
