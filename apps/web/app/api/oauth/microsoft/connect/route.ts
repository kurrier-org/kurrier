import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspaceId, getWorkspacePublicId } from "@/lib/actions/clients";
import {
	buildMicrosoftAuthorizationUrl,
	createMicrosoftOAuthState,
} from "@providers";
import crypto from "node:crypto";
export async function GET() {
	const user = await isSignedIn();
	if (!user)
		return NextResponse.redirect(new URL("/auth/login", process.env.WEB_URL));
	const clientId = process.env.MICROSOFT_CLIENT_ID;
	if (!clientId)
		return NextResponse.redirect(
			new URL(
				"/auth/login?error=microsoft_oauth_not_configured",
				process.env.WEB_URL,
			),
		);
	const workspaceId = await getWorkspaceId(),
		publicId = await getWorkspacePublicId(),
		{ state, codeVerifier } = createMicrosoftOAuthState();
	const challenge = crypto
			.createHash("sha256")
			.update(codeVerifier)
			.digest("base64url"),
		store = await cookies();
	const opts = {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
		maxAge: 600,
	};
	for (const [k, v] of [
		["state", state],
		["code_verifier", codeVerifier],
		["workspace_id", workspaceId],
		["workspace_public_id", publicId],
		["owner_id", user.id],
	])
		store.set(`microsoft_provider_${k}`, v, opts);
	return NextResponse.redirect(
		buildMicrosoftAuthorizationUrl({
			clientId,
			redirectUri: `${process.env.WEB_URL}/api/oauth/microsoft/callback`,
			state,
			codeChallenge: challenge,
			tenant: process.env.MICROSOFT_TENANT ?? "common",
			loginHint: user.email,
		}),
	);
}
