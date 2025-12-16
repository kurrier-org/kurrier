import { createServerClient } from "@supabase/ssr";
import {getHeader, H3Event} from "h3";
import { getEnv } from "@schema";

export function createSupabaseFromRequest(event: H3Event) {
    const {
        public: { API_URL },
        server: { SERVICE_ROLE_KEY },
    } = getEnv();

    const cookieHeader = getHeader(event, "cookie") ?? "";

    return createServerClient(
        API_URL,
        SERVICE_ROLE_KEY,
        {
            cookies: {
                getAll() {
                    return cookieHeader
                        .split(";")
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .map((c) => {
                            const i = c.indexOf("=");
                            return { name: c.slice(0, i), value: c.slice(i + 1) };
                        });
                },
                setAll() {},
            },
        }
    );
}
