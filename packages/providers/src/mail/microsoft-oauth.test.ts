import assert from "node:assert/strict";
import test from "node:test";
import {
	buildMicrosoftAuthorizationUrl,
	createMicrosoftCredentials,
	createMicrosoftOAuthState,
	exchangeMicrosoftAuthorizationCode,
	isMicrosoftTokenExpired,
	loadMicrosoftCredentials,
	MICROSOFT_MAIL_SCOPES,
	refreshMicrosoftAccessToken,
	validateMicrosoftOAuthState,
	withMicrosoftRefreshLock,
	xoauth2String,
} from "./microsoft-oauth";

test("OAuth-created Microsoft credentials reach the refresh loader", async () => {
	const credentials = createMicrosoftCredentials({
		email: "person@example.com",
		clientId: "client",
		tenant: "common",
		token: {
			accessToken: "expired-access",
			refreshToken: "old-refresh",
			expiresAt: new Date(Date.now() - 1_000),
			tokenType: "Bearer",
		},
	});
	let persisted: Record<string, unknown> | undefined;
	const result = await loadMicrosoftCredentials(credentials, {
		key: "oauth-created-account",
		persist: async (next) => {
			persisted = next;
		},
		fetcher: async () =>
			new Response(
				JSON.stringify({
					access_token: "fresh-access",
					refresh_token: "fresh-refresh",
					expires_in: 3600,
				}),
				{ status: 200 },
			),
	});
	assert.equal(result.provider, "microsoft");
	assert.equal(result.IMAP_ACCESS_TOKEN, "fresh-access");
	assert.equal(persisted?.MICROSOFT_REFRESH_TOKEN, "fresh-refresh");
});

test("builds Microsoft authorization URL with PKCE and state", () => {
	const url = new URL(
		buildMicrosoftAuthorizationUrl({
			clientId: "client-id",
			redirectUri: "https://app.example/callback",
			state: "state-value",
			codeChallenge: "challenge-value",
			tenant: "organizations",
		}),
	);
	assert.equal(url.origin, "https://login.microsoftonline.com");
	assert.equal(url.pathname, "/organizations/oauth2/v2.0/authorize");
	assert.equal(url.searchParams.get("response_type"), "code");
	assert.equal(url.searchParams.get("code_challenge"), "challenge-value");
	assert.equal(url.searchParams.get("code_challenge_method"), "S256");
	assert.equal(url.searchParams.get("state"), "state-value");
	assert.equal(url.searchParams.get("scope"), MICROSOFT_MAIL_SCOPES.join(" "));
});

test("includes the nonce in the authorization request", () => {
	const url = new URL(
		buildMicrosoftAuthorizationUrl({
			clientId: "client-id",
			redirectUri: "https://app.example/callback",
			state: "state-value",
			codeChallenge: "challenge-value",
			nonce: "nonce-value",
		}),
	);
	assert.equal(url.searchParams.get("nonce"), "nonce-value");
});
test("creates an opaque state and verifier pair", () => {
	const first = createMicrosoftOAuthState();
	const second = createMicrosoftOAuthState();
	assert.match(first.state, /^[A-Za-z0-9_-]{32,}$/);
	assert.match(first.codeVerifier, /^[A-Za-z0-9_-]{43,128}$/);
	assert.notEqual(first.state, second.state);
});
test("exchanges a code and preserves refresh token rotation", async () => {
	const calls: RequestInit[] = [];
	const response = await exchangeMicrosoftAuthorizationCode(
		{
			clientId: "client-id",
			clientSecret: "client-secret",
			code: "auth-code",
			codeVerifier: "verifier",
			redirectUri: "https://app.example/callback",
			tenant: "common",
		},
		async (_input, init) => {
			calls.push(init ?? {});
			return new Response(
				JSON.stringify({
					access_token: "access-token",
					refresh_token: "rotated-refresh-token",
					expires_in: 3600,
					token_type: "Bearer",
					scope: MICROSOFT_MAIL_SCOPES.join(" "),
				}),
				{ status: 200 },
			);
		},
	);
	assert.equal(response.accessToken, "access-token");
	assert.equal(response.refreshToken, "rotated-refresh-token");
	assert.equal(
		new URLSearchParams(String(calls[0].body)).get("grant_type"),
		"authorization_code",
	);
});
test("reports actionable Microsoft refresh errors", async () => {
	await assert.rejects(
		refreshMicrosoftAccessToken(
			{
				clientId: "id",
				clientSecret: "secret",
				refreshToken: "refresh",
				tenant: "common",
			},
			async () =>
				new Response(
					JSON.stringify({
						error: "invalid_grant",
						error_description: "AADSTS70008: expired",
					}),
					{ status: 400 },
				),
		),
		/Microsoft authorization expired or was revoked.*reconnect/i,
	);
});
test("formats the RFC 7628 XOAUTH2 initial client response", () => {
	assert.equal(
		Buffer.from(
			xoauth2String("person@example.com", "access-token"),
			"base64",
		).toString("utf8"),
		"user=person@example.com\x01auth=Bearer access-token\x01\x01",
	);
});

test("validates callback state and token expiry skew", () => {
	assert.equal(validateMicrosoftOAuthState("state", "state"), true);
	assert.equal(validateMicrosoftOAuthState("state", "other"), false);
	assert.equal(isMicrosoftTokenExpired(new Date(Date.now() + 10_000)), true);
});

test("does not expose provider error descriptions", async () => {
	await assert.rejects(
		refreshMicrosoftAccessToken(
			{ clientId: "id", refreshToken: "refresh", tenant: "common" },
			async () =>
				new Response(
					JSON.stringify({
						error: "temporarily_unavailable",
						error_description: "secret tenant detail",
					}),
					{ status: 503 },
				),
		),
		(error: unknown) =>
			error instanceof Error &&
			!error.message.includes("secret tenant detail") &&
			error.message.includes("temporarily_unavailable"),
	);
});

test("centralizes expired Microsoft SMTP and IMAP credential refresh", async () => {
	const { loadMicrosoftCredentials } = await import("./microsoft-oauth");
	let saved: Record<string, unknown> | undefined;
	const credentials = {
		provider: "microsoft",
		MICROSOFT_CLIENT_ID: "client",
		MICROSOFT_REFRESH_TOKEN: "old-refresh",
		MICROSOFT_TENANT: "common",
		SMTP_TOKEN_EXPIRES_AT: new Date(Date.now() - 1_000).toISOString(),
		IMAP_TOKEN_EXPIRES_AT: new Date(Date.now() - 1_000).toISOString(),
	};
	const result = await loadMicrosoftCredentials(credentials, {
		key: "loader-test",
		persist: async (next) => {
			saved = next;
		},
		fetcher: async () =>
			new Response(
				JSON.stringify({
					access_token: "new-access",
					refresh_token: "new-refresh",
					expires_in: 3600,
				}),
				{ status: 200 },
			),
	});
	assert.equal(result.SMTP_ACCESS_TOKEN, "new-access");
	assert.equal(result.IMAP_ACCESS_TOKEN, "new-access");
	assert.equal(result.MICROSOFT_REFRESH_TOKEN, "new-refresh");
	assert.equal(saved?.MICROSOFT_REFRESH_TOKEN, "new-refresh");
});

test("coalesces concurrent refreshes and persists the rotated token once", async () => {
	let refreshes = 0;
	let saves = 0;
	const result = await Promise.all([
		withMicrosoftRefreshLock(
			"secret",
			async () => {
				refreshes++;
				await new Promise((resolve) => setTimeout(resolve, 5));
				return "token-1";
			},
			async () => {
				saves++;
			},
		),
		withMicrosoftRefreshLock(
			"secret",
			async () => {
				refreshes++;
				return "token-2";
			},
			async () => {
				saves++;
			},
		),
	]);
	assert.deepEqual(result, ["token-1", "token-1"]);
	assert.equal(refreshes, 1);
	assert.equal(saves, 1);
});

test("passes the distributed fence to CAS persistence", async () => {
	let owner = "";
	let persisted = false;
	const redis = {
		set: async (...args: string[]) => {
			owner = args[1];
			return "OK";
		},
		eval: async () => 1,
	};
	await withMicrosoftRefreshLock(
		"cas-test",
		async () => "rotated-token",
		async (_value, fenceToken) => {
			if (fenceToken !== owner) throw new Error("stale CAS fence rejected");
			persisted = true;
		},
		undefined,
		{ distributed: true, redis },
	);
	assert.equal(persisted, true);
});

test("renews a distributed refresh lease until persistence completes", async () => {
	const calls: string[] = [];
	const redis = {
		set: async () => "OK",
		eval: async (...args: unknown[]) => {
			const script = String(args[0]);
			if (script.includes("pexpire")) calls.push("renew");
			else calls.push("release");
			return 1;
		},
	};
	await withMicrosoftRefreshLock(
		"lease-test",
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 30));
			return "rotated-token";
		},
		async () => {},
		undefined,
		{ distributed: true, redis, leaseMs: 15, renewEveryMs: 5 },
	);
	assert.ok(calls.includes("renew"));
	assert.equal(calls.at(-1), "release");
});

test("does not persist with a stale refresh fence", async () => {
	let persisted = false;
	const redis = {
		set: async () => "OK",
		eval: async (...args: unknown[]) => {
			const script = String(args[0]);
			if (script.includes("pexpire")) return 0;
			return 1;
		},
	};
	await assert.rejects(
		withMicrosoftRefreshLock(
			"stale-fence",
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return "rotated-token";
			},
			async () => {
				persisted = true;
			},
			undefined,
			{ distributed: true, redis, leaseMs: 20, renewEveryMs: 1 },
		),
		/Microsoft refresh lock lease lost/,
	);
	assert.equal(persisted, false);
});
