import { createRemoteJWKSet, jwtVerify } from "jose";

const MICROSOFT_JWKS = createRemoteJWKSet(
	new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys"),
);

export async function verifyMicrosoftIdToken(input: {
	token: string;
	clientId: string;
	nonce: string;
}) {
	const { payload } = await jwtVerify(input.token, MICROSOFT_JWKS, {
		audience: input.clientId,
		algorithms: ["RS256"],
		requiredClaims: ["iss", "aud", "exp", "nonce", "tid"],
	});
	const tenantId = typeof payload.tid === "string" ? payload.tid : "";
	const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
	if (payload.iss !== issuer) throw new Error("invalid_issuer");
	if (payload.nonce !== input.nonce) throw new Error("invalid_nonce");
	return payload;
}
