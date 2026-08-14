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

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_PROVIDER_NAME = "google";

export async function GET(request: NextRequest) {
    // Behind a reverse proxy, Next.js standalone rewrites request.url's host
    // to the server's own hostname, and openid-client derives the
    // token-exchange redirect_uri from the current URL — anchor on WEB_URL.
    const baseUrl = process.env.WEB_URL || request.url;

    const cookieStore = await cookies();

    const codeVerifier = cookieStore.get("google_code_verifier")?.value;
    const state = cookieStore.get("google_state")?.value;

    if (!codeVerifier || !state) {
        return NextResponse.redirect(new URL("/auth/login", baseUrl));
    }

    const config = await client.discovery(
        new URL(GOOGLE_ISSUER),
        process.env.OIDC_GOOGLE_CLIENT_ID!,
        process.env.OIDC_GOOGLE_CLIENT_SECRET!,
    );

    const currentUrl = new URL(request.url);
    const callbackUrl = process.env.WEB_URL
        ? new URL(
              `${process.env.WEB_URL}/api/auth/oidc/google/callback${currentUrl.search}`,
          )
        : currentUrl;

    const tokens = await client.authorizationCodeGrant(
        config,
        callbackUrl,
        {
            pkceCodeVerifier: codeVerifier,
            expectedState: state,
        },
    );

    const claims = tokens.claims();

    const providerUserId = claims?.sub as string | undefined;
    const email = claims?.email as string | undefined;
    const emailVerified = claims?.email_verified === true;

    /*
     * `sub` is the stable identity assigned by the OIDC provider.
     *
     * Do not use email to identify returning OAuth users.
     */
    if (!providerUserId) {
        return NextResponse.redirect(new URL("/auth/login", baseUrl));
    }

    /*
     * First try to resolve an already-linked Google account.
     *
     * provider + sub is the external identity.
     */
    const [existingAuthAccount] = await db
        .select({
            account: authAccounts,
        })
        .from(authAccounts)
        .innerJoin(
            authProviders,
            eq(authAccounts.providerId, authProviders.id),
        )
        .where(
            and(
                eq(authAccounts.providerUserId, providerUserId),
                eq(authProviders.name, GOOGLE_PROVIDER_NAME),
                eq(authProviders.type, "oidc"),
                eq(authProviders.issuerUrl, GOOGLE_ISSUER),
            ),
        )
        .limit(1);

    let user: typeof users.$inferSelect;

    if (existingAuthAccount) {
        /*
         * Returning Google user.
         *
         * The auth account is authoritative. We deliberately don't look the
         * user up by email here.
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
         * 1. link the Google identity to an existing Kurrier user, or
         * 2. provision a new Kurrier user.
         *
         * Don't automatically link/create from an unverified email.
         */
        if (!email || !emailVerified) {
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
                return NextResponse.redirect(
                    new URL("/auth/login", baseUrl),
                );
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
    let [googleProvider] = await db
        .select()
        .from(authProviders)
        .where(
            and(
                eq(authProviders.workspaceId, workspace.id),
                eq(authProviders.name, GOOGLE_PROVIDER_NAME),
                eq(authProviders.type, "oidc"),
                eq(authProviders.issuerUrl, GOOGLE_ISSUER),
            ),
        )
        .limit(1);

    if (!googleProvider) {
        [googleProvider] = await db
            .insert(authProviders)
            .values({
                ownerId: user.id,
                workspaceId: workspace.id,
                name: GOOGLE_PROVIDER_NAME,
                type: "oidc",
                issuerUrl: GOOGLE_ISSUER,
                clientId: process.env.OIDC_GOOGLE_CLIENT_ID!,
                enabled: true,
                metaData: {
                    scopes: "openid email profile",
                },
            })
            .returning();
    }

    /*
     * On first login this creates the permanent mapping:
     *
     *     Google issuer + sub -> authAccount -> Kurrier user
     *
     * On later logins the row already exists and this is a no-op.
     */
    if (!existingAuthAccount) {
        await db
            .insert(authAccounts)
            .values({
                userId: user.id,
                providerId: googleProvider.id,
                providerUserId,
                email: email!,
                emailVerified,
                rawProfile: claims ?? null,
                workspaceId: workspace.id,
            })
            .onConflictDoNothing();
    }

    cookieStore.delete("google_code_verifier");
    cookieStore.delete("google_state");

    await createSessionForUser(user.id);

    const redirectUrl = await getWorkspaceRedirectUrl(user);

    return NextResponse.redirect(new URL(redirectUrl, baseUrl));
}
