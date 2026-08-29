import crypto from "node:crypto";
import IORedis from "ioredis";

export const MICROSOFT_MAIL_SCOPES = [
	"openid",
	"profile",
	"email",
	"offline_access",
	"https://outlook.office.com/IMAP.AccessAsUser.All",
	"https://outlook.office.com/SMTP.Send",
] as const;
export type MicrosoftOAuthConfig = {
	clientId: string;
	clientSecret?: string;
	tenant: string;
	redirectUri?: string;
};
export type MicrosoftTokenSet = {
	accessToken: string;
	refreshToken?: string;
	expiresAt: Date;
	scope?: string;
	tokenType: string;
	idToken?: string;
};
type Fetcher = typeof fetch;
const endpoint = (tenant: string) =>
	`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
const encoded = (value: Buffer) => value.toString("base64url");

export function createMicrosoftOAuthState() {
	return {
		state: encoded(crypto.randomBytes(32)),
		codeVerifier: encoded(crypto.randomBytes(32)),
		nonce: encoded(crypto.randomBytes(32)),
	};
}
export function buildMicrosoftAuthorizationUrl(input: {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
	tenant?: string;
	loginHint?: string;
	nonce?: string;
}) {
	const url = new URL(
		`https://login.microsoftonline.com/${encodeURIComponent(input.tenant ?? "common")}/oauth2/v2.0/authorize`,
	);
	url.search = new URLSearchParams({
		client_id: input.clientId,
		response_type: "code",
		redirect_uri: input.redirectUri,
		response_mode: "query",
		scope: MICROSOFT_MAIL_SCOPES.join(" "),
		code_challenge: input.codeChallenge,
		code_challenge_method: "S256",
		state: input.state,
		...(input.nonce ? { nonce: input.nonce } : {}),
		...(input.loginHint ? { login_hint: input.loginHint } : {}),
	}).toString();
	return url.toString();
}
async function tokenRequest(
	config: MicrosoftOAuthConfig,
	params: Record<string, string>,
	fetcher: Fetcher,
): Promise<MicrosoftTokenSet> {
	const response = await fetcher(endpoint(config.tenant), {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: config.clientId,
			...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
			...params,
		}).toString(),
	});
	const data = (await response.json()) as Record<string, unknown>;
	if (!response.ok || typeof data.access_token !== "string") {
		const code = String(data.error ?? "unknown_error");
		const detail = String(data.error_description ?? "");
		if (code === "invalid_grant" || /expired|revoked|consent/i.test(detail))
			throw new Error(
				"Microsoft authorization expired or was revoked; reconnect the mailbox. ",
			);
		throw new Error(`Microsoft OAuth failed (${code})`);
	}
	const expiresIn = Number(data.expires_in ?? 3600);
	return {
		accessToken: data.access_token,
		refreshToken:
			typeof data.refresh_token === "string" ? data.refresh_token : undefined,
		expiresAt: new Date(Date.now() + expiresIn * 1000),
		scope: typeof data.scope === "string" ? data.scope : undefined,
		tokenType: typeof data.token_type === "string" ? data.token_type : "Bearer",
		idToken: typeof data.id_token === "string" ? data.id_token : undefined,
	};
}
export function exchangeMicrosoftAuthorizationCode(
	input: {
		clientId: string;
		clientSecret?: string;
		code: string;
		codeVerifier: string;
		redirectUri: string;
		tenant?: string;
	},
	fetcher: Fetcher = fetch,
) {
	return tokenRequest(
		{
			clientId: input.clientId,
			clientSecret: input.clientSecret,
			tenant: input.tenant ?? "common",
		},
		{
			grant_type: "authorization_code",
			code: input.code,
			code_verifier: input.codeVerifier,
			redirect_uri: input.redirectUri,
		},
		fetcher,
	);
}
export function refreshMicrosoftAccessToken(
	input: {
		clientId: string;
		clientSecret?: string;
		refreshToken: string;
		tenant?: string;
	},
	fetcher: Fetcher = fetch,
) {
	return tokenRequest(
		{
			clientId: input.clientId,
			clientSecret: input.clientSecret,
			tenant: input.tenant ?? "common",
		},
		{
			grant_type: "refresh_token",
			refresh_token: input.refreshToken,
			scope: MICROSOFT_MAIL_SCOPES.join(" "),
		},
		fetcher,
	);
}
export function xoauth2String(username: string, accessToken: string) {
	return Buffer.from(
		`user=${username}\x01auth=Bearer ${accessToken}\x01\x01`,
	).toString("base64");
}
export function isMicrosoftTokenExpired(expiresAt: Date, skewSeconds = 60) {
	return expiresAt.getTime() <= Date.now() + skewSeconds * 1000;
}
export type MicrosoftCredentials = Record<string, unknown>;

export function createMicrosoftCredentials(input: {
	email: string;
	clientId: string;
	tenant: string;
	token: MicrosoftTokenSet;
}): MicrosoftCredentials {
	const { email, clientId, tenant, token } = input;
	return {
		provider: "microsoft",
		SMTP_HOST: "smtp.office365.com",
		SMTP_PORT: "587",
		SMTP_USERNAME: email,
		SMTP_AUTH_METHOD: "xoauth2",
		SMTP_ACCESS_TOKEN: token.accessToken,
		SMTP_TOKEN_EXPIRES_AT: token.expiresAt.toISOString(),
		SMTP_SECURE: "false",
		IMAP_HOST: "outlook.office365.com",
		IMAP_PORT: "993",
		IMAP_USERNAME: email,
		IMAP_AUTH_METHOD: "xoauth2",
		IMAP_ACCESS_TOKEN: token.accessToken,
		IMAP_TOKEN_EXPIRES_AT: token.expiresAt.toISOString(),
		IMAP_SECURE: "true",
		MICROSOFT_REFRESH_TOKEN: token.refreshToken,
		MICROSOFT_TENANT: tenant,
		MICROSOFT_CLIENT_ID: clientId,
		MICROSOFT_SCOPES: MICROSOFT_MAIL_SCOPES.join(" "),
	};
}

export async function loadMicrosoftCredentials(
	credentials: MicrosoftCredentials,
	options: {
		key: string;
		persist: (
			value: MicrosoftCredentials,
			fenceToken?: string,
		) => Promise<void>;
		load?: () => Promise<MicrosoftCredentials | null>;
		distributed?: boolean;
		redis?: RefreshRedis;
		leaseMs?: number;
		renewEveryMs?: number;
		fetcher?: Fetcher;
	},
): Promise<MicrosoftCredentials> {
	const expiries = [
		credentials.SMTP_TOKEN_EXPIRES_AT,
		credentials.IMAP_TOKEN_EXPIRES_AT,
	].filter((value): value is string => typeof value === "string");
	if (
		credentials.provider !== "microsoft" ||
		typeof credentials.MICROSOFT_REFRESH_TOKEN !== "string" ||
		expiries.length === 0 ||
		expiries.every((value) => !isMicrosoftTokenExpired(new Date(value)))
	)
		return credentials;

	const refreshed = await withMicrosoftRefreshLock(
		options.key,
		() =>
			refreshMicrosoftAccessToken(
				{
					clientId: String(credentials.MICROSOFT_CLIENT_ID),
					clientSecret:
						typeof credentials.MICROSOFT_CLIENT_SECRET === "string"
							? credentials.MICROSOFT_CLIENT_SECRET
							: undefined,
					refreshToken: String(credentials.MICROSOFT_REFRESH_TOKEN),
					tenant: String(credentials.MICROSOFT_TENANT ?? "common"),
				},
				options.fetcher,
			),
		async (next, fenceToken) =>
			options.persist(
				{
					...credentials,
					SMTP_ACCESS_TOKEN: next.accessToken,
					IMAP_ACCESS_TOKEN: next.accessToken,
					MICROSOFT_REFRESH_TOKEN:
						next.refreshToken ?? credentials.MICROSOFT_REFRESH_TOKEN,
					SMTP_TOKEN_EXPIRES_AT: next.expiresAt.toISOString(),
					IMAP_TOKEN_EXPIRES_AT: next.expiresAt.toISOString(),
				},
				fenceToken,
			),
		options.load
			? async () => {
					const current = await options.load?.();
					const accessToken =
						current?.SMTP_ACCESS_TOKEN ?? current?.IMAP_ACCESS_TOKEN;
					const expiresAt =
						current?.SMTP_TOKEN_EXPIRES_AT ?? current?.IMAP_TOKEN_EXPIRES_AT;
					const refreshToken = current?.MICROSOFT_REFRESH_TOKEN;
					if (
						!accessToken ||
						!expiresAt ||
						typeof refreshToken !== "string" ||
						isMicrosoftTokenExpired(new Date(String(expiresAt)))
					)
						return null;
					return {
						accessToken: String(accessToken),
						refreshToken,
						expiresAt: new Date(String(expiresAt)),
						tokenType: "Bearer",
					};
				}
			: undefined,
		{
			distributed: options.distributed,
			redis: options.redis,
			leaseMs: options.leaseMs,
			renewEveryMs: options.renewEveryMs,
		},
	);
	return {
		...credentials,
		SMTP_ACCESS_TOKEN: refreshed.accessToken,
		IMAP_ACCESS_TOKEN: refreshed.accessToken,
		MICROSOFT_REFRESH_TOKEN:
			refreshed.refreshToken ?? credentials.MICROSOFT_REFRESH_TOKEN,
		SMTP_TOKEN_EXPIRES_AT: refreshed.expiresAt.toISOString(),
		IMAP_TOKEN_EXPIRES_AT: refreshed.expiresAt.toISOString(),
	};
}

export function validateMicrosoftOAuthState(
	expected: string,
	received: string | null | undefined,
) {
	if (!received || expected.length !== received.length) return false;
	return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

const microsoftRefreshes = new Map<string, Promise<unknown>>();
let refreshRedis: IORedis | undefined;
type RefreshRedis = {
	set: (...args: string[]) => Promise<string | null>;
	pexpire: (key: string, milliseconds: number) => Promise<number>;
	eval: (...args: unknown[]) => Promise<unknown>;
};
const getRefreshRedis = (): RefreshRedis => {
	if (!refreshRedis)
		refreshRedis = new IORedis({
			host: process.env.REDIS_HOST || "redis",
			port: Number(process.env.REDIS_PORT || 6379),
			password: process.env.REDIS_PASSWORD,
			maxRetriesPerRequest: null,
		});
	return refreshRedis as unknown as RefreshRedis;
};
export function withMicrosoftRefreshLock<T>(
	key: string,
	refresh: () => Promise<T>,
	persist: (value: T, fenceToken?: string) => Promise<void>,
	load?: () => Promise<T | null>,
	options?: {
		distributed?: boolean;
		redis?: RefreshRedis;
		leaseMs?: number;
		renewEveryMs?: number;
	},
): Promise<T> {
	if (!options?.distributed) {
		const existing = microsoftRefreshes.get(key);
		if (existing) return existing as Promise<T>;
		const operation = refresh()
			.then(async (value) => {
				await persist(value);
				return value;
			})
			.finally(() => {
				if (microsoftRefreshes.get(key) === operation)
					microsoftRefreshes.delete(key);
			});
		microsoftRefreshes.set(key, operation);
		return operation;
	}
	const lockKey = `kurrier:microsoft-refresh-lock:${key}`;
	const owner = crypto.randomUUID();
	const redis = options.redis ?? getRefreshRedis();
	const leaseMs = options.leaseMs ?? 30_000;
	const renewEveryMs =
		options.renewEveryMs ?? Math.max(1_000, Math.floor(leaseMs / 3));
	return (async () => {
		const acquired = await redis.set(
			lockKey,
			owner,
			"PX",
			String(leaseMs),
			"NX",
		);
		if (acquired !== "OK") {
			if (!load) throw new Error("Microsoft refresh is already in progress");
			for (let attempt = 0; attempt < 600; attempt++) {
				const value = await load();
				if (value) return value;
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			throw new Error("Microsoft refresh lock timed out");
		}
		let leaseLost = false;
		let renewal: Promise<void> | undefined;
		const renew = async () => {
			try {
				const renewed = await redis.eval(
					"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end",
					1,
					lockKey,
					owner,
					String(leaseMs),
				);
				if (renewed !== 1) leaseLost = true;
			} catch {
				leaseLost = true;
			}
		};
		const interval = setInterval(() => {
			if (!renewal)
				renewal = renew().finally(() => {
					renewal = undefined;
				});
		}, renewEveryMs);
		try {
			const current = load ? await load() : null;
			if (current) return current;
			const value = await refresh();
			if (renewal) await renewal;
			if (leaseLost) throw new Error("Microsoft refresh lock lease lost");
			const fenced = await redis.eval(
				"if redis.call('get', KEYS[1]) == ARGV[1] then return 1 else return 0 end",
				1,
				lockKey,
				owner,
			);
			if (fenced !== 1) throw new Error("Microsoft refresh lock lease lost");
			await persist(value, owner);
			return value;
		} finally {
			clearInterval(interval);
			if (renewal) await renewal;
			await redis.eval(
				"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
				1,
				lockKey,
				owner,
			);
		}
	})();
}
