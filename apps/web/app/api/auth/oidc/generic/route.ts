import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
	discoverGenericOidc,
	getGenericOidcSettings,
} from "@/lib/generic-oidc";

export async function GET(request: NextRequest) {
	const settings = getGenericOidcSettings();

	if (!settings) {
		return NextResponse.redirect(new URL("/auth/login", request.url));
	}

	const config = await discoverGenericOidc(settings);

	const codeVerifier = client.randomPKCECodeVerifier();
	const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
	const state = client.randomState();

	const cookieStore = await cookies();

	cookieStore.set("oidc_code_verifier", codeVerifier, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 10,
	});

	cookieStore.set("oidc_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 10,
	});

	const redirectTo = client.buildAuthorizationUrl(config, {
		redirect_uri: `${process.env.WEB_URL}/api/auth/oidc/generic/callback`,
		scope: settings.scopes,
		code_challenge: codeChallenge,
		code_challenge_method: "S256",
		state,
	});

	return NextResponse.redirect(redirectTo);
}
