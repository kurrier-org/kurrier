import * as client from "openid-client";
import { eq } from "drizzle-orm";
import {
    db,
    getSecretAdmin,
    updateSecretAdmin,
    microsoftAccounts,
} from "@db";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const pendingRefreshes = new Map<string, Promise<string>>();

async function refreshMicrosoftAccessToken(
    account: typeof microsoftAccounts.$inferSelect,
): Promise<string> {
    if (!account.refreshTokenSecretId) {
        throw new Error("Microsoft refresh token missing. Please reconnect.");
    }

    const secret = await getSecretAdmin(account.refreshTokenSecretId);
    const refreshToken = secret?.vault?.decrypted_secret;

    if (!refreshToken) {
        throw new Error("Microsoft refresh token unavailable. Please reconnect.");
    }

    const config = await client.discovery(
        new URL("https://login.microsoftonline.com/organizations/v2.0"),
        process.env.MICROSOFT_CLIENT_ID!,
        process.env.MICROSOFT_CLIENT_SECRET!,
    );

    try {
        const tokens = await client.refreshTokenGrant(
            config,
            String(refreshToken),
        );

        if (!tokens.access_token) {
            throw new Error("Microsoft did not return an access token");
        }

        if (!account.accessTokenSecretId) {
            throw new Error("Microsoft access token secret missing");
        }

        await updateSecretAdmin(account.accessTokenSecretId, {
            value: tokens.access_token,
        });

        if (tokens.refresh_token) {
            await updateSecretAdmin(account.refreshTokenSecretId, {
                value: tokens.refresh_token,
            });
        }

        await db
            .update(microsoftAccounts)
            .set({
                expiresAt:
                    typeof tokens.expires_in === "number"
                        ? new Date(Date.now() + tokens.expires_in * 1000)
                        : null,
                status: "connected",
                lastError: null,
                updatedAt: new Date(),
                metaData: {
                    ...(account.metaData ?? {}),
                    lastTokenRefreshAt: new Date().toISOString(),
                    receivedRotatedRefreshToken: Boolean(tokens.refresh_token),
                },
            })
            .where(eq(microsoftAccounts.id, account.id));

        return tokens.access_token;
    } catch (err: any) {
        const message = err?.message ?? "Microsoft token refresh failed";

        const revoked =
            message.includes("invalid_grant") ||
            message.includes("AADSTS700082") ||
            message.includes("AADSTS700084");

        await db
            .update(microsoftAccounts)
            .set({
                status: revoked ? "revoked" : "error",
                lastError: message,
                updatedAt: new Date(),
            })
            .where(eq(microsoftAccounts.id, account.id));

        throw err;
    }
}

export async function getMicrosoftAccessToken(
    accountId: string,
): Promise<string> {
    const pending = pendingRefreshes.get(accountId);

    if (pending) {
        return pending;
    }

    const [account] = await db
        .select()
        .from(microsoftAccounts)
        .where(eq(microsoftAccounts.id, accountId))
        .limit(1);

    if (!account) {
        throw new Error("Microsoft account not found");
    }

    if (
        account.accessTokenSecretId &&
        account.expiresAt &&
        account.expiresAt.getTime() > Date.now() + REFRESH_BUFFER_MS
    ) {
        const secret = await getSecretAdmin(account.accessTokenSecretId);
        const token = secret?.vault?.decrypted_secret;

        if (token) {
            return String(token);
        }
    }

    const refresh = refreshMicrosoftAccessToken(account);

    pendingRefreshes.set(accountId, refresh);

    try {
        return await refresh;
    } finally {
        if (pendingRefreshes.get(accountId) === refresh) {
            pendingRefreshes.delete(accountId);
        }
    }
}
