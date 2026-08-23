import { and, eq } from "drizzle-orm";
import {
    db,
    getSecretAdmin,
    updateSecretAdmin,
    googleAccounts,
    identities, secretsMeta,
} from "@db";
import { google } from "googleapis";

function safeGoogleError(err: any) {
    const responseData = err?.response?.data;

    return {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        status: err?.status,
        responseData,
        causeMessage: err?.cause?.message,
    };
}

function errorMessage(err: any) {
    return (
        err?.response?.data?.error_description ||
        err?.response?.data?.error ||
        err?.message ||
        "Google OAuth error"
    );
}

async function markGoogleAccountError(
    googleAccountId: string,
    status: "error" | "revoked",
    message: string,
) {
    await db
        .update(googleAccounts)
        .set({
            status,
            lastError: message,
            updatedAt: new Date(),
        })
        .where(eq(googleAccounts.id, googleAccountId));
}

async function buildGoogleClientForAccount(
    googleAccount: typeof googleAccounts.$inferSelect,
) {
    if (!googleAccount?.refreshTokenSecretId) {
        await markGoogleAccountError(
            googleAccount.id,
            "revoked",
            "Google refresh token not found",
        );
        throw new Error("Google refresh token not found. Please reconnect Google.");
    }

    const { clientId, clientSecret } = await resolveGoogleOAuthConfig(googleAccount.workspaceId);

    const refreshSecret = await getSecretAdmin(
        String(googleAccount.refreshTokenSecretId),
    );

    const refreshToken = refreshSecret?.vault?.decrypted_secret
        ? String(refreshSecret.vault.decrypted_secret)
        : "";

    if (!refreshToken) {
        await markGoogleAccountError(
            googleAccount.id,
            "revoked",
            "Google refresh token secret is empty",
        );
        throw new Error("Google refresh token is empty. Please reconnect Google.");
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });

    oauth2Client.on("tokens", async (tokens) => {
        try {
            if (tokens.access_token && googleAccount.accessTokenSecretId) {
                await updateSecretAdmin(googleAccount.accessTokenSecretId, {
                    value: tokens.access_token,
                });
            }

            if (tokens.refresh_token && googleAccount.refreshTokenSecretId) {
                await updateSecretAdmin(googleAccount.refreshTokenSecretId, {
                    value: tokens.refresh_token,
                });
            }

            await db
                .update(googleAccounts)
                .set({
                    expiresAt: tokens.expiry_date
                        ? new Date(tokens.expiry_date)
                        : googleAccount.expiresAt,
                    status: "connected",
                    lastError: null,
                    updatedAt: new Date(),
                    metaData: {
                        ...(googleAccount.metaData ?? {}),
                        lastTokenRefreshAt: new Date().toISOString(),
                        receivedRotatedRefreshToken: Boolean(tokens.refresh_token),
                        receivedAccessTokenRefresh: Boolean(tokens.access_token),
                    },
                })
                .where(eq(googleAccounts.id, googleAccount.id));
        } catch (err) {
            console.error("[GOOGLE CLIENT] failed to persist refreshed tokens", {
                googleAccountId: googleAccount.id,
                email: googleAccount.email,
                ...safeGoogleError(err),
            });
        }
    });

    try {
        await oauth2Client.getAccessToken();
    } catch (err: any) {
        const msg = errorMessage(err);

        console.error("[GOOGLE CLIENT] getAccessToken failed", {
            googleAccountId: googleAccount.id,
            email: googleAccount.email,
            ...safeGoogleError(err),
        });

        const isRevoked =
            msg.includes("invalid_grant") ||
            msg.includes("expired") ||
            msg.includes("revoked");

        await markGoogleAccountError(
            googleAccount.id,
            isRevoked ? "revoked" : "error",
            msg,
        );

        throw new Error(
            isRevoked
                ? "Google connection expired or was revoked. Please reconnect Google."
                : msg,
        );
    }

    const gmail = google.gmail({
        version: "v1",
        auth: oauth2Client,
    });

    return {
        gmail,
        googleAccount,
        oauth2Client,

        markConnected: async () => {
            await db
                .update(googleAccounts)
                .set({
                    status: "connected",
                    lastError: null,
                    lastSyncedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(googleAccounts.id, googleAccount.id));
        },

        markError: async (message: string) => {
            await db
                .update(googleAccounts)
                .set({
                    status: "error",
                    lastError: message,
                    updatedAt: new Date(),
                })
                .where(eq(googleAccounts.id, googleAccount.id));
        },
    };
}

export async function gmailClientForIdentity(
    identityId: string,
    workspaceId?: string,
) {
    const where = workspaceId
        ? and(eq(identities.id, identityId), eq(identities.workspaceId, workspaceId))
        : eq(identities.id, identityId);

    const [identity] = await db
        .select()
        .from(identities)
        .where(where)
        .limit(1);

    if (!identity) throw new Error("Identity not found");

    const googleAccountId = (identity.metaData as any)?.gmail?.googleAccountId;

    if (!googleAccountId) {
        throw new Error("Missing googleAccountId");
    }

    const [googleAccount] = await db
        .select()
        .from(googleAccounts)
        .where(eq(googleAccounts.id, googleAccountId))
        .limit(1);

    if (!googleAccount) throw new Error("Google account not found");

    const client = await buildGoogleClientForAccount(googleAccount);

    return {
        ...client,
        identity,
    };
}

export async function gmailClientForGoogleAccount(googleAccountId: string) {
    const [googleAccount] = await db
        .select()
        .from(googleAccounts)
        .where(eq(googleAccounts.id, googleAccountId))
        .limit(1);

    if (!googleAccount) throw new Error("Google account not found");

    return buildGoogleClientForAccount(googleAccount);
}


type GoogleOAuthConfig = {
    clientId: string;
    clientSecret: string;
};

const GOOGLE_MAIL_OAUTH_SECRET_NAME = "GOOGLE_MAIL_OAUTH_CONFIG";

export async function resolveGoogleOAuthConfig(
    workspaceId: string,
): Promise<GoogleOAuthConfig> {
    const [secret] = await db
        .select({
            id: secretsMeta.id,
        })
        .from(secretsMeta)
        .where(
            and(
                eq(secretsMeta.workspaceId, workspaceId),
                eq(secretsMeta.name, GOOGLE_MAIL_OAUTH_SECRET_NAME),
                eq(secretsMeta.managedBy, "user"),
            ),
        )
        .limit(1);

    if (secret) {
        const { vault } = await getSecretAdmin(secret.id);

        if (vault?.decrypted_secret) {
            try {
                const parsed = JSON.parse(vault.decrypted_secret);

                if (parsed.clientId && parsed.clientSecret) {
                    return {
                        clientId: String(parsed.clientId),
                        clientSecret: String(parsed.clientSecret),
                    };
                }
            } catch {

            }
        }
    }

    const clientId =
        process.env.GOOGLE_MAIL_CLIENT_ID ??
        process.env.OIDC_GOOGLE_CLIENT_ID;

    const clientSecret =
        process.env.GOOGLE_MAIL_CLIENT_SECRET ??
        process.env.OIDC_GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Google Mail OAuth is not configured");
    }

    return {
        clientId,
        clientSecret,
    };
}
