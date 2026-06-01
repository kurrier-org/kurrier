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

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();

    const codeVerifier = cookieStore.get("google_code_verifier")?.value;
    const state = cookieStore.get("google_state")?.value;

    if (!codeVerifier || !state) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const config = await client.discovery(
        new URL("https://accounts.google.com"),
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
    );

    const tokens = await client.authorizationCodeGrant(
        config,
        new URL(request.url),
        {
            pkceCodeVerifier: codeVerifier,
            expectedState: state,
        },
    );

    const claims = tokens.claims();

    const email = claims?.email as string | undefined;
    const providerUserId = claims?.sub as string | undefined;

    if (!email || !providerUserId) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
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
            return NextResponse.redirect(new URL("/auth/login", request.url));
        }

        user = createdUser;
    }

    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, user.id));

    if (!workspace) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    let [googleProvider] = await db
        .select()
        .from(authProviders)
        .where(
            and(
                eq(authProviders.workspaceId, workspace.id),
                eq(authProviders.name, "google"),
            ),
        );

    if (!googleProvider) {
        [googleProvider] = await db
            .insert(authProviders)
            .values({
                ownerId: user.id,
                workspaceId: workspace.id,
                name: "google",
                type: "oidc",
                issuerUrl: "https://accounts.google.com",
                clientId: process.env.GOOGLE_CLIENT_ID!,
                enabled: true,
                metaData: {
                    scopes: "openid email profile",
                },
            })
            .returning();
    }

    await db
        .insert(authAccounts)
        .values({
            userId: user.id,
            providerId: googleProvider.id,
            providerUserId,
            email,
            emailVerified: claims?.email_verified === true,
            rawProfile: claims ?? null,
            workspaceId: workspace.id,
        })
        .onConflictDoNothing();

    cookieStore.delete("google_code_verifier");
    cookieStore.delete("google_state");

    await createSessionForUser(user.id);

    const redirectUrl = await getWorkspaceRedirectUrl(user);

    return NextResponse.redirect(new URL(redirectUrl, request.url));
}
