import assert from "node:assert/strict";
import test from "node:test";
import {
	buildMicrosoftAuthorizationUrl,
	createMicrosoftOAuthState,
} from "../../../../packages/providers/src/mail/microsoft-oauth";
import { createMicrosoftOAuthTransactionRecord } from "./microsoft-transaction";

test("uses one OAuth state in authorization URL and transaction record", () => {
	const oauth = createMicrosoftOAuthState();
	const transaction = createMicrosoftOAuthTransactionRecord({
		userId: "user-id",
		workspaceId: "workspace-id",
		publicId: "public-id",
		state: oauth.state,
		codeVerifier: oauth.codeVerifier,
		nonce: oauth.nonce,
	});
	const authorizationUrl = new URL(
		buildMicrosoftAuthorizationUrl({
			clientId: "client-id",
			redirectUri: "https://app.example/callback",
			state: oauth.state,
			codeChallenge: "challenge",
			nonce: oauth.nonce,
		}),
	);

	assert.equal(authorizationUrl.searchParams.get("state"), transaction.state);
});
