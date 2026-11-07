import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
	createSecretAdmin,
	updateSecretAdmin,
	getSecretAdmin,
	db,
	microsoftAccounts,
} from "@db";

function redirectWithError(workspacePublicId: string, message: string) {
	return NextResponse.redirect(
		new URL(
			`/w/${workspacePublicId}/dashboard/platform/providers?microsoft_error=${encodeURIComponent(message)}`,
			process.env.WEB_URL,
		),
	);
}

export async function GET(request: NextRequest) {
	const cookieStore = await cookies();

	const codeVerifier = cookieStore.get(
		"microsoft_provider_code_verifier",
	)?.value;
	const state = cookieStore.get("microsoft_provider_state")?.value;
	const workspaceId = cookieStore.get("microsoft_provider_workspace_id")?.value;
	const workspacePublicId = cookieStore.get(
		"microsoft_provider_workspace_public_id",
	)?.value;
	const ownerId = cookieStore.get("microsoft_provider_owner_id")?.value;

	if (
		!codeVerifier ||
		!state ||
		!workspaceId ||
		!workspacePublicId ||
		!ownerId
	) {
		return NextResponse.redirect(new URL("/auth/login", process.env.WEB_URL));
	}

	const config = await client.discovery(
		new URL("https://login.microsoftonline.com/common/v2.0"),
		process.env.MICROSOFT_CLIENT_ID!,
		process.env.MICROSOFT_CLIENT_SECRET!,
	);

	const callbackUrl = new URL(
		request.nextUrl.pathname + request.nextUrl.search,
		process.env.WEB_URL!,
	);

	let tokens: client.TokenEndpointResponse &
		client.TokenEndpointResponseHelpers;

	try {
		tokens = await client.authorizationCodeGrant(config, callbackUrl, {
			pkceCodeVerifier: codeVerifier,
			expectedState: state,
		});
	} catch (err: any) {
		console.error("[MICROSOFT OAUTH CALLBACK FAILED]", {
			message: err?.message,
			code: err?.code,
			error: err?.error,
			error_description: err?.error_description,
		});

		return redirectWithError(
			workspacePublicId,
			err?.error_description || err?.message || "Microsoft OAuth failed",
		);
	}

	const accessToken = tokens.access_token;
	const newRefreshToken = tokens.refresh_token;
	const claims = tokens.claims();

	if (!accessToken) {
		return redirectWithError(
			workspacePublicId,
			"Microsoft access token missing",
		);
	}

	const microsoftUserId = String(claims?.oid ?? claims?.sub ?? "");
	const tenantId = String(claims?.tid ?? "");
	const email = String(claims?.preferred_username ?? claims?.email ?? "");
	const name = claims?.name ? String(claims.name) : null;

	if (!microsoftUserId || !tenantId || !email) {
		return redirectWithError(
			workspacePublicId,
			"Microsoft identity information missing",
		);
	}

	const [existing] = await db
		.select()
		.from(microsoftAccounts)
		.where(
			and(
				eq(microsoftAccounts.workspaceId, workspaceId),
				eq(microsoftAccounts.tenantId, tenantId),
				eq(microsoftAccounts.microsoftUserId, microsoftUserId),
			),
		)
		.limit(1);

	let effectiveRefreshToken = newRefreshToken ?? null;

	if (!effectiveRefreshToken && existing?.refreshTokenSecretId) {
		const oldRefreshSecret = await getSecretAdmin(
			existing.refreshTokenSecretId,
		);

		effectiveRefreshToken = oldRefreshSecret?.vault?.decrypted_secret
			? String(oldRefreshSecret.vault.decrypted_secret)
			: null;
	}

	if (!effectiveRefreshToken) {
		return redirectWithError(
			workspacePublicId,
			"Microsoft did not return a refresh token. Please reconnect your account.",
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

	await db.transaction(async (tx) => {
		let accessTokenSecretId = existing?.accessTokenSecretId ?? null;
		let refreshTokenSecretId = existing?.refreshTokenSecretId ?? null;

		const secretKey = `${tenantId}:${microsoftUserId}`;

		if (accessTokenSecretId) {
			await updateSecretAdmin(accessTokenSecretId, {
				value: accessToken,
			});
		} else {
			const secret = await createSecretAdmin({
				ownerId,
				workspaceId,
				name: `microsoft-access-token:${secretKey}`,
				description: `Microsoft access token for ${email}`,
				value: accessToken,
			});

			accessTokenSecretId = secret.id;
		}

		if (refreshTokenSecretId) {
			await updateSecretAdmin(refreshTokenSecretId, {
				value: effectiveRefreshToken!,
			});
		} else {
			const secret = await createSecretAdmin({
				ownerId,
				workspaceId,
				name: `microsoft-refresh-token:${secretKey}`,
				description: `Microsoft refresh token for ${email}`,
				value: effectiveRefreshToken!,
			});

			refreshTokenSecretId = secret.id;
		}

		const values = {
			email,
			name,
			accessTokenSecretId,
			refreshTokenSecretId,
			scopes,
			expiresAt,
			status: "connected" as const,
			lastError: null,
			updatedAt: new Date(),
			metaData: {
				...(existing?.metaData ?? {}),
				hasRefreshToken: true,
				receivedNewRefreshToken: Boolean(newRefreshToken),
			},
		};

		if (existing) {
			await tx
				.update(microsoftAccounts)
				.set(values)
				.where(eq(microsoftAccounts.id, existing.id));
		} else {
			await tx.insert(microsoftAccounts).values({
				workspaceId,
				ownerId,
				microsoftUserId,
				tenantId,
				...values,
			});
		}
	});

	cookieStore.delete("microsoft_provider_code_verifier");
	cookieStore.delete("microsoft_provider_state");
	cookieStore.delete("microsoft_provider_workspace_id");
	cookieStore.delete("microsoft_provider_workspace_public_id");
	cookieStore.delete("microsoft_provider_owner_id");

	return NextResponse.redirect(
		new URL(
			`/w/${workspacePublicId}/dashboard/platform/providers?connected=microsoft`,
			process.env.WEB_URL,
		),
	);
}
