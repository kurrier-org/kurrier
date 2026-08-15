import * as client from "openid-client";

export type GenericOidcSettings = {
	issuerUrl: string;
	clientId: string;
	clientSecret: string;
	providerName: string;
	scopes: string;
	tokenAuthMethod: "client_secret_basic" | "client_secret_post";
};

/**
 * Reads the generic OIDC provider settings from the environment.
 * Returns null unless OIDC_ISSUER_URL, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET
 * are all present, which keeps the feature fully opt-in.
 */
export function getGenericOidcSettings(): GenericOidcSettings | null {
	const issuerUrl = process.env.OIDC_ISSUER_URL;
	const clientId = process.env.OIDC_CLIENT_ID;
	const clientSecret = process.env.OIDC_CLIENT_SECRET;

	if (!issuerUrl || !clientId || !clientSecret) {
		return null;
	}

	return {
		issuerUrl,
		clientId,
		clientSecret,
		providerName: process.env.OIDC_PROVIDER_NAME || "SSO",
		scopes: process.env.OIDC_SCOPES || "openid email profile",
		tokenAuthMethod:
			process.env.OIDC_TOKEN_AUTH_METHOD === "client_secret_post"
				? "client_secret_post"
				: "client_secret_basic",
	};
}

/**
 * client_secret_basic is the default here (RFC 6749 recommends it and IdPs
 * like Authelia reject client_secret_post unless explicitly configured),
 * while openid-client v6 would otherwise default to client_secret_post.
 */
export async function discoverGenericOidc(settings: GenericOidcSettings) {
	const issuer = new URL(settings.issuerUrl);
	return client.discovery(
		issuer,
		settings.clientId,
		undefined,
		settings.tokenAuthMethod === "client_secret_post"
			? client.ClientSecretPost(settings.clientSecret)
			: client.ClientSecretBasic(settings.clientSecret),
		// An http:// issuer is only ever useful against a local development
		// IdP (mock servers, test containers); openid-client refuses plain
		// HTTP unless explicitly allowed.
		issuer.protocol === "http:"
			? { execute: [client.allowInsecureRequests] }
			: undefined,
	);
}
