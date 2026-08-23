import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/actions/auth";
import {getWorkspaceId, getWorkspacePublicId} from "@/lib/actions/clients";
import { resolveGoogleOAuthConfig } from "@providers";

export async function GET() {
    const user = await isSignedIn();

    if (!user) {
        return NextResponse.redirect(
            new URL("/auth/login", process.env.WEB_URL),
        );
    }

    const workspaceId = await getWorkspaceId();
    const workspacePublicId = await getWorkspacePublicId();

    const { clientId, clientSecret } = await resolveGoogleOAuthConfig(workspaceId);
    const config = await client.discovery(
        new URL("https://accounts.google.com"),
        clientId,
        clientSecret,
    );

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge =
        await client.calculatePKCECodeChallenge(codeVerifier);

    const state = client.randomState();

    const cookieStore = await cookies();

    cookieStore.set(
        "google_provider_code_verifier",
        codeVerifier,
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        },
    );

    cookieStore.set(
        "google_provider_state",
        state,
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        },
    );

    cookieStore.set(
        "google_provider_workspace_id",
        workspaceId,
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        },
    );

    cookieStore.set(
        "google_provider_workspace_public_id",
        workspacePublicId,
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        },
    );

    cookieStore.set("google_provider_owner_id", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
    });

    const redirectTo = client.buildAuthorizationUrl(config, {
        redirect_uri: `${process.env.WEB_URL}/api/oauth/google/callback`,

        scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
        ].join(" "),

        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "false",
        login_hint: user.email,

        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
    });

    return NextResponse.redirect(redirectTo);
}
