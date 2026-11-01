import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspaceId, getWorkspacePublicId } from "@/lib/actions/clients";

export async function GET() {
    const user = await isSignedIn();

    if (!user) {
        return NextResponse.redirect(
            new URL("/auth/login", process.env.WEB_URL),
        );
    }

    const workspaceId = await getWorkspaceId();
    const workspacePublicId = await getWorkspacePublicId();

    const config = await client.discovery(
        new URL("https://login.microsoftonline.com/common/v2.0"),
        process.env.MICROSOFT_CLIENT_ID!,
        process.env.MICROSOFT_CLIENT_SECRET!,
    );

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    const cookieStore = await cookies();

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 10,
    };

    cookieStore.set("microsoft_provider_code_verifier", codeVerifier, options);
    cookieStore.set("microsoft_provider_state", state, options);
    cookieStore.set("microsoft_provider_workspace_id", workspaceId, options);
    cookieStore.set("microsoft_provider_workspace_public_id", workspacePublicId, options);
    cookieStore.set("microsoft_provider_owner_id", user.id, options);

    const redirectTo = client.buildAuthorizationUrl(config, {
        redirect_uri: `${process.env.WEB_URL}/api/oauth/microsoft/callback`,

        scope: [
            "openid",
            "email",
            "profile",
            "offline_access",
            "https://outlook.office.com/IMAP.AccessAsUser.All",
            "https://outlook.office.com/SMTP.Send",
        ].join(" "),

        prompt: "select_account",

        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
    });

    return NextResponse.redirect(redirectTo);
}
