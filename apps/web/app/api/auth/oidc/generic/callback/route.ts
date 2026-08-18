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

	/*
	 * `sub` is the stable identity assigned by the OIDC provider.
	 *
	 * Do not use email to identify returning OIDC users.
	 */
	const providerUserId = claims.sub as string | undefined;
	const email = claims.email as string | undefined;
	const emailVerified = claims.email_verified === true;

	if (!providerUserId) {
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	/*
	 * First try to resolve an already-linked account.
	 *
	 * provider + sub is the external identity.
	 */
	const [existingAuthAccount] = await db
		.select({
			account: authAccounts,
		})
		.from(authAccounts)
		.innerJoin(authProviders, eq(authAccounts.providerId, authProviders.id))
		.where(
			and(
				eq(authAccounts.providerUserId, providerUserId),
				eq(authProviders.name, GENERIC_PROVIDER_NAME),
				eq(authProviders.type, "oidc"),
				eq(authProviders.issuerUrl, settings.issuerUrl),
			),
		)
		.limit(1);

	let user: typeof users.$inferSelect;

	if (existingAuthAccount) {
		/*
		 * Returning user.
		 *
		 * The auth account is authoritative. We deliberately don't look the
		 * user up by email here — a change to the email returned by the IdP
		 * must not change which Kurrier user is authenticated.
		 */
		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.id, existingAuthAccount.account.userId))
			.limit(1);

		if (!existingUser) {
			return NextResponse.redirect(new URL("/auth/login", baseUrl));
		}

		user = existingUser;
	} else {
		/*
		 * First login / account linking.
		 *
		 * Email is only used at this point to either:
		 *
		 * 1. link the external identity to an existing Kurrier user, or
		 * 2. provision a new Kurrier user.
		 *
		 * Don't automatically link/create from an unverified email, unless
		 * the operator has explicitly opted out via OIDC_REQUIRE_VERIFIED_EMAIL.
		 */
		if (!email || (settings.requireVerifiedEmail && !emailVerified)) {
			return NextResponse.redirect(new URL("/auth/login", baseUrl));
		}

		let [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!existingUser) {
			const passwordHash = await argon2.hash(crypto.randomUUID());

			const createdUser = await createUserWithWorkspace({
				email,
				passwordHash,
				workspaceName: "Default Workspace",
			});

			if (!createdUser || "error" in createdUser) {
				return NextResponse.redirect(new URL("/auth/login", baseUrl));
			}

			existingUser = createdUser;
		}

		user = existingUser;
	}

	const [workspace] = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerId, user.id))
		.limit(1);

	if (!workspace) {
		return NextResponse.redirect(new URL("/auth/login", baseUrl));
	}

	/*
	 * Existing auth accounts already have a provider, so technically we only
	 * need to create/find this for first-time linking. Keeping this here makes
	 * the existing workspace/provider model work without changing the schema.
	 */
	let [genericProvider] = await db
		.select()
		.from(authProviders)
		.where(
			and(
				eq(authProviders.workspaceId, workspace.id),
				eq(authProviders.name, GENERIC_PROVIDER_NAME),
				eq(authProviders.type, "oidc"),
				eq(authProviders.issuerUrl, settings.issuerUrl),
			),
		)
		.limit(1);

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

	/*
	 * On first login this creates the permanent mapping:
	 *
	 *     issuer + sub -> authAccount -> Kurrier user
	 *
	 * On later logins the row already exists and this is a no-op.
	 */
	if (!existingAuthAccount) {
		await db
			.insert(authAccounts)
			.values({
				userId: user.id,
				providerId: genericProvider.id,
				providerUserId,
				email: email!,
				emailVerified,
				rawProfile: claims ?? null,
				workspaceId: workspace.id,
			})
			.onConflictDoNothing();
	}

	cookieStore.delete("oidc_code_verifier");
	cookieStore.delete("oidc_state");

	await createSessionForUser(user.id);

	const redirectUrl = await getWorkspaceRedirectUrl(user);

	return NextResponse.redirect(new URL(redirectUrl, baseUrl));
}
