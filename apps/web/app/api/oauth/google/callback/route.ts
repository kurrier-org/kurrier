import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { gmailClientForGoogleAccount } from "@providers";
import {
    createSecretAdmin,
    updateSecretAdmin,
    getSecretAdmin,
    db,
    googleAccounts,
} from "@db";

function redirectWithError(workspacePublicId: string, message: string) {
    return NextResponse.redirect(
        new URL(
            `/w/${workspacePublicId}/dashboard/platform/providers?google_error=${encodeURIComponent(message)}`,
            process.env.WEB_URL,
        ),
    );
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();

    const codeVerifier = cookieStore.get("google_provider_code_verifier")?.value;
    const state = cookieStore.get("google_provider_state")?.value;
    const workspaceId = cookieStore.get("google_provider_workspace_id")?.value;
    const workspacePublicId = cookieStore.get("google_provider_workspace_public_id")?.value;
    const ownerId = cookieStore.get("google_provider_owner_id")?.value;

    if (!codeVerifier || !state || !workspaceId || !workspacePublicId || !ownerId) {
        return NextResponse.redirect(new URL("/auth/login", process.env.WEB_URL));
    }

    const config = await client.discovery(
        new URL("https://accounts.google.com"),
        process.env.OIDC_GOOGLE_CLIENT_ID!,
        process.env.OIDC_GOOGLE_CLIENT_SECRET!,
    );

    const callbackUrl = new URL(
        request.nextUrl.pathname + request.nextUrl.search,
        process.env.WEB_URL!,
    );

    let tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers;

    try {
        tokens = await client.authorizationCodeGrant(config, callbackUrl, {
            pkceCodeVerifier: codeVerifier,
            expectedState: state,
        });
    } catch (err: any) {
        console.error("[GOOGLE OAUTH CALLBACK FAILED]", {
            rawUrl: request.url,
            callbackUrl: callbackUrl.toString(),
            message: err?.message,
            code: err?.code,
            error: err?.error,
            status: err?.status,
            error_description: err?.error_description,
            expectedState: state,
            gotState: request.nextUrl.searchParams.get("state"),
        });

        return redirectWithError(
            workspacePublicId,
            err?.error_description || err?.message || "Google OAuth failed",
        );
    }

    const accessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token;
    const claims = tokens.claims();

    if (!accessToken) {
        return redirectWithError(workspacePublicId, "Google access token missing");
    }

    const profile = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());

    const googleSub = String(profile.sub ?? claims?.sub ?? "");
    const email = String(profile.email ?? claims?.email ?? "");
    const name = profile.name ? String(profile.name) : null;
    const pictureUrl = profile.picture ? String(profile.picture) : null;

    if (!googleSub || !email) {
        return redirectWithError(workspacePublicId, "Google profile missing sub or email");
    }

    const [existing] = await db
        .select()
        .from(googleAccounts)
        .where(
            and(
                eq(googleAccounts.workspaceId, workspaceId),
                eq(googleAccounts.googleSub, googleSub),
            ),
        )
        .limit(1);

    let effectiveRefreshToken = newRefreshToken ?? null;

    if (!effectiveRefreshToken && existing?.refreshTokenSecretId) {
        const oldRefreshSecret = await getSecretAdmin(existing.refreshTokenSecretId);
        effectiveRefreshToken = oldRefreshSecret?.vault?.decrypted_secret
            ? String(oldRefreshSecret.vault.decrypted_secret)
            : null;
    }

    if (!effectiveRefreshToken) {
        return redirectWithError(
            workspacePublicId,
            "Google did not return a refresh token. Remove Kurrier access from your Google Account and reconnect.",
        );
    }

    const scopes = String(tokens.scope ?? "")
        .split(" ")
        .map((scope) => scope.trim())
        .filter(Boolean);

    const expiresAt =
        typeof tokens.expires_in === "number"
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null;

    let googleAccountId: string;

    await db.transaction(async (tx) => {
        let accessTokenSecretId = existing?.accessTokenSecretId ?? null;
        let refreshTokenSecretId = existing?.refreshTokenSecretId ?? null;

        if (accessTokenSecretId) {
            await updateSecretAdmin(accessTokenSecretId, { value: accessToken });
        } else {
            const accessSecret = await createSecretAdmin({
                ownerId,
                workspaceId,
                name: `google-access-token:${googleSub}`,
                description: `Google access token for ${email}`,
                value: accessToken,
            });
            accessTokenSecretId = accessSecret.id;
        }

        if (refreshTokenSecretId) {
            await updateSecretAdmin(refreshTokenSecretId, {
                value: effectiveRefreshToken!,
            });
        } else {
            const refreshSecret = await createSecretAdmin({
                ownerId,
                workspaceId,
                name: `google-refresh-token:${googleSub}`,
                description: `Google refresh token for ${email}`,
                value: effectiveRefreshToken!,
            });
            refreshTokenSecretId = refreshSecret.id;
        }

        if (existing) {
            googleAccountId = existing.id;

            await tx
                .update(googleAccounts)
                .set({
                    email,
                    name,
                    pictureUrl,
                    accessTokenSecretId,
                    refreshTokenSecretId,
                    scopes,
                    expiresAt,
                    status: "connected",
                    lastError: null,
                    updatedAt: new Date(),
                    metaData: {
                        ...(existing.metaData ?? {}),
                        hasRefreshToken: true,
                        receivedNewRefreshToken: Boolean(newRefreshToken),
                    },
                })
                .where(eq(googleAccounts.id, existing.id));
        } else {
            const [created] = await tx
                .insert(googleAccounts)
                .values({
                    workspaceId,
                    ownerId,
                    googleSub,
                    email,
                    name,
                    pictureUrl,
                    accessTokenSecretId,
                    refreshTokenSecretId,
                    scopes,
                    expiresAt,
                    status: "connected",
                    lastError: null,
                    metaData: {
                        hasRefreshToken: true,
                        receivedNewRefreshToken: Boolean(newRefreshToken),
                    },
                })
                .returning();

            googleAccountId = created.id;
        }
    });

    try {
        const { gmail, markConnected } = await gmailClientForGoogleAccount(googleAccountId!);
        await gmail.users.getProfile({ userId: "me" });
        await markConnected();
    } catch (err: any) {
        console.error("[GOOGLE POST-CALLBACK VERIFY FAILED]", err);

        return redirectWithError(
            workspacePublicId,
            err?.message || "Google connection failed after reconnect",
        );
    }

    cookieStore.delete("google_provider_code_verifier");
    cookieStore.delete("google_provider_state");
    cookieStore.delete("google_provider_workspace_id");
    cookieStore.delete("google_provider_workspace_public_id");
    cookieStore.delete("google_provider_owner_id");

    return NextResponse.redirect(
        new URL(
            `/w/${workspacePublicId}/dashboard/platform/providers?connected=google`,
            process.env.WEB_URL,
        ),
    );
}
