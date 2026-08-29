import test from "node:test";
import assert from "node:assert/strict";
import {
	MICROSOFT_MAIL_SCOPES,
	buildMicrosoftAuthorizationUrl,
	createMicrosoftOAuthState,
	exchangeMicrosoftAuthorizationCode,
	refreshMicrosoftAccessToken,
	xoauth2String,
	isMicrosoftTokenExpired,
	validateMicrosoftOAuthState,
} from "./microsoft-oauth";

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
		xoauth2String("person@example.com", "access-token"),
		"dXNlcj1wZXJzb25AZXhhbXBsZS5jb20BYXV0aD1CZWFyZXIgYWNjZXNzLXRva2VuAQE=",
	);
});

test("validates callback state and token expiry skew", () => {
	assert.equal(validateMicrosoftOAuthState("state", "state"), true);
	assert.equal(validateMicrosoftOAuthState("state", "other"), false);
	assert.equal(isMicrosoftTokenExpired(new Date(Date.now() + 10_000)), true);
});
