import { z } from "zod";

/** Common helpers */
const ZPort = z.coerce.number().int().min(1).max(65535);
const ZNodeEnv = z.enum(["development", "production", "test"]);

/** Server-only (never sent to the browser) */
export const ZServerConfig = z.object({
	WEB_PORT: ZPort.default(3000),
	NODE_ENV: ZNodeEnv.default("development"),
	DATABASE_URL: z.string(
		"DATABASE_URL must be a valid Postgres connection URL",
	),
	DATABASE_RLS_URL: z.string(
		"DATABASE_RLS_URL must be a valid Postgres connection URL",
	),
	SUPABASE_SERVICE_ROLE_KEY: z.string(
		"NEXT_SUPABASE_SERVICE_ROLE_KEY must be present",
	),
    REDIS_PASSWORD: z.string("REDIS_PASSWORD must be present",),
    REDIS_HOST: z.string("REDIS_HOST must be present",),
    REDIS_PORT: z.string("REDIS_PORT must be present",),
});

/** Safe to expose to the browser */
export const ZPublicConfig = z.object({
	NEXT_PUBLIC_API_BASE: z
		.string("PUBLIC_API_BASE must be a valid URL")
		.optional(),
	SUPABASE_DOMAIN: z.string("SUPABASE_DOMAIN must be present"),
	SUPABASE_ANON_KEY: z.string("SUPABASE_ANON_KEY must be present"),
	WEB_URL: z.string("WEB_URL must be present"),
	WEB_PROXY_URL: z.string().optional(),
});

export type ServerConfig = z.infer<typeof ZServerConfig>;
export type PublicConfig = z.infer<typeof ZPublicConfig>;

// Use a generic env shape so this package doesn't depend on Node typings
type RawEnv = Record<string, string | undefined>;

function formatZodError(label: string, err: z.ZodError) {
	const flat = err.flatten();

	const fieldErrors = Object.entries(flat.fieldErrors)
		.map(([k, v]) => {
			// v is `unknown` to TS; make it a string[] safely
			const msgs = Array.isArray(v) ? (v as string[]) : [];
			return `  - ${k}: ${msgs.join(", ")}`;
		})
		.join("\n");

	const formErrors = (flat.formErrors ?? []).map((e) => `  - ${e}`).join("\n");

	return `[${label}] Invalid configuration\n${fieldErrors}${formErrors ? `\n${formErrors}` : ""}`;
}

export function parseServerConfig(env: RawEnv): ServerConfig {
	const res = ZServerConfig.safeParse(env);
	if (!res.success) throw new Error(formatZodError("ServerConfig", res.error));
	return res.data;
}

export function parsePublicConfig(env: RawEnv): PublicConfig {
	const res = ZPublicConfig.safeParse(env);
	if (!res.success) throw new Error(formatZodError("PublicConfig", res.error));
	return res.data;
}

/** Convenience: parse both in one call (optionally cached) */
let _cache: { server: ServerConfig; public: PublicConfig } | null = null;

export function parseEnv(env: RawEnv): {
	server: ServerConfig;
	public: PublicConfig;
} {
	return {
		server: parseServerConfig(env),
		public: parsePublicConfig(env),
	};
}

/** Return only server-side envs */
export function getServerEnv(
	env: RawEnv = process.env as unknown as RawEnv,
): ServerConfig {
	return parseServerConfig(env);
}

export function getPublicEnv(
	env: RawEnv = process.env as unknown as RawEnv,
): PublicConfig {
	return parsePublicConfig(env);
}

export function getEnv(env: RawEnv = process.env as unknown as RawEnv) {
	return (_cache ??= parseEnv(env));
}
