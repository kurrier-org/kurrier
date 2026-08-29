import crypto from "node:crypto";
import {
	buildMicrosoftAuthorizationUrl,
	createMicrosoftOAuthState,
} from "@providers";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspaceId, getWorkspacePublicId } from "@/lib/actions/clients";
import { createMicrosoftOAuthTransaction } from "@/lib/oauth/microsoft-transaction";

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
	const workspaceId = await getWorkspaceId();
	const publicId = await getWorkspacePublicId();
	const { state, codeVerifier, nonce } = createMicrosoftOAuthState();
	const challenge = crypto
		.createHash("sha256")
		.update(codeVerifier)
		.digest("base64url");
	const tx = await createMicrosoftOAuthTransaction({
		userId: user.id,
		workspaceId,
		publicId,
		codeVerifier,
		nonce,
	});
	const store = await cookies();
	store.set("microsoft_provider_tx", tx.id, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 600,
	});
	return NextResponse.redirect(
		buildMicrosoftAuthorizationUrl({
			clientId,
			redirectUri: `${process.env.WEB_URL}/api/oauth/microsoft/callback`,
			state,
			codeChallenge: challenge,
			tenant: process.env.MICROSOFT_TENANT ?? "common",
			nonce,
			loginHint: user.email,
		}),
	);
}
