import crypto from "node:crypto";

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
};
type Fetcher = typeof fetch;
const endpoint = (tenant: string) =>
	`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
const encoded = (value: Buffer) => value.toString("base64url");

export function createMicrosoftOAuthState() {
	return {
		state: encoded(crypto.randomBytes(32)),
		codeVerifier: encoded(crypto.randomBytes(32)),
	};
}
export function buildMicrosoftAuthorizationUrl(input: {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
	tenant?: string;
	loginHint?: string;
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
		const detail = String(
			data.error_description ?? "Microsoft token request failed",
		);
		if (code === "invalid_grant" || /expired|revoked|consent/i.test(detail))
			throw new Error(
				"Microsoft authorization expired or was revoked; reconnect the mailbox. ",
			);
		throw new Error(`Microsoft OAuth failed (${code}): ${detail}`);
	}
	const expiresIn = Number(data.expires_in ?? 3600);
	return {
		accessToken: data.access_token,
		refreshToken:
			typeof data.refresh_token === "string" ? data.refresh_token : undefined,
		expiresAt: new Date(Date.now() + expiresIn * 1000),
		scope: typeof data.scope === "string" ? data.scope : undefined,
		tokenType: typeof data.token_type === "string" ? data.token_type : "Bearer",
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
export function validateMicrosoftOAuthState(
	expected: string,
	received: string | null | undefined,
) {
	if (!received || expected.length !== received.length) return false;
	return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
