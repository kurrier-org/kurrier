import * as client from "openid-client";
import argon2 from "argon2";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
	authAccounts,
	authProviders,
	db,
	users,
	workspaces,
} from "@db";
import {
	createSessionForUser,
	createUserWithWorkspace,
	getWorkspaceRedirectUrl,
} from "@/lib/actions/auth";
import {
	discoverGenericOidc,
	getGenericOidcSettings,
} from "@/lib/generic-oidc";

const GENERIC_PROVIDER_NAME = "generic";

export async function GET(request: NextRequest) {
	// Behind a reverse proxy, Next.js standalone rewrites request.url's host
	// to the server's own hostname (e.g. the pod name on Kubernetes), and
	// openid-client derives the token-exchange redirect_uri from the current
	// URL — so anchor everything on WEB_URL, the canonical public origin.
	const baseUrl = process.env.WEB_URL || request.url;

	const settings = getGenericOidcSettings();

	if (!settings) {
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	const cookieStore = await cookies();

	const codeVerifier = cookieStore.get("oidc_code_verifier")?.value;
	const state = cookieStore.get("oidc_state")?.value;

	if (!codeVerifier || !state) {
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	let claims: Record<string, unknown>;

	try {
		const config = await discoverGenericOidc(settings);

		const currentUrl = new URL(request.url);
		const callbackUrl = process.env.WEB_URL
			? new URL(
					`${process.env.WEB_URL}/api/auth/oidc/generic/callback${currentUrl.search}`,
				)
			: currentUrl;

		const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
			pkceCodeVerifier: codeVerifier,
			expectedState: state,
		});

		const idTokenClaims = tokens.claims();

		if (!idTokenClaims?.sub) {
			return NextResponse.redirect(new URL("/auth/login", baseUrl));
		}

		claims = { ...idTokenClaims };

		// Some IdPs (e.g. Authelia) only expose profile claims such as `email`
		// through the userinfo endpoint, not inside the ID token.
		if (!claims.email) {
			const userInfo = await client.fetchUserInfo(
				config,
				tokens.access_token,
				idTokenClaims.sub,
			);
			claims = { ...claims, ...userInfo };
		}
	} catch (err) {
		console.error("[OIDC] generic callback failed:", err);
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	const email = claims.email as string | undefined;
	const providerUserId = claims.sub as string | undefined;

	if (!email || !providerUserId) {
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	let [user] = await db.select().from(users).where(eq(users.email, email));

	if (!user) {
		const passwordHash = await argon2.hash(crypto.randomUUID());

		const createdUser = await createUserWithWorkspace({
			email,
			passwordHash,
			workspaceName: "Default Workspace",
		});

		if (!createdUser || "error" in createdUser) {
			return NextResponse.redirect(new URL("/auth/login", baseUrl));
		}

		user = createdUser;
	}

	const [workspace] = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerId, user.id));

	if (!workspace) {
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	let [genericProvider] = await db
		.select()
		.from(authProviders)
		.where(
			and(
				eq(authProviders.workspaceId, workspace.id),
				eq(authProviders.name, GENERIC_PROVIDER_NAME),
			),
		);

	if (!genericProvider) {
		[genericProvider] = await db
			.insert(authProviders)
			.values({
				ownerId: user.id,
				workspaceId: workspace.id,
				name: GENERIC_PROVIDER_NAME,
				type: "oidc",
				issuerUrl: settings.issuerUrl,
				clientId: settings.clientId,
				enabled: true,
				metaData: {
					displayName: settings.providerName,
					scopes: settings.scopes,
				},
			})
			.returning();
	}

	await db
		.insert(authAccounts)
		.values({
			userId: user.id,
			providerId: genericProvider.id,
			providerUserId,
			email,
			emailVerified: claims.email_verified === true,
			rawProfile: claims ?? null,
			workspaceId: workspace.id,
		})
		.onConflictDoNothing();

	cookieStore.delete("oidc_code_verifier");
	cookieStore.delete("oidc_state");

	await createSessionForUser(user.id);

	const redirectUrl = await getWorkspaceRedirectUrl(user);

	return NextResponse.redirect(new URL(redirectUrl, baseUrl));
}
