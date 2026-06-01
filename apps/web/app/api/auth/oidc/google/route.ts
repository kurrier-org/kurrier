import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const config = await client.discovery(
        new URL("https://accounts.google.com"),
        process.env.OIDC_GOOGLE_CLIENT_ID!,
        process.env.OIDC_GOOGLE_CLIENT_SECRET!,
    );

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    const cookieStore = await cookies();

    cookieStore.set("google_code_verifier", codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
    });

    cookieStore.set("google_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
    });

    const redirectTo = client.buildAuthorizationUrl(config, {
        redirect_uri: `${process.env.WEB_URL}/api/auth/oidc/google/callback`,
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
    });

    return NextResponse.redirect(redirectTo);
}
