import crypto from "node:crypto";
import {
	createSecret,
	identities,
	secretsMeta,
	smtpAccountSecrets,
	smtpAccounts,
} from "@db";
import {
	exchangeMicrosoftAuthorizationCode,
	MICROSOFT_MAIL_SCOPES,
	type MicrosoftTokenSet,
	validateMicrosoftOAuthState,
} from "@providers";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { currentSession, isSignedIn } from "@/lib/actions/auth";
import { getWorkspaceId, rlsClient } from "@/lib/actions/clients";
import { createEmailIdentity } from "@/lib/actions/email-identity";
import { compensateMicrosoftOAuthResources } from "@/lib/oauth/microsoft-compensation";
import { verifyMicrosoftIdToken } from "@/lib/oauth/microsoft-oidc";
import { consumeMicrosoftOAuthTransaction } from "@/lib/oauth/microsoft-transaction";

const fail = (
	id: string,
	code = "microsoft_oauth_failed",
	correlationId = crypto.randomUUID(),
) => {
	console.error("[MICROSOFT OAUTH CALLBACK FAILED]", { correlationId, code });
	return NextResponse.redirect(
		new URL(
			`/w/${id}/dashboard/platform/providers?microsoft_error=${code}&correlation_id=${correlationId}`,
			process.env.WEB_URL,
		),
	);
};

export async function GET(req: NextRequest) {
	const c = await cookies();
	const txId = c.get("microsoft_provider_tx")?.value;
	const session = await currentSession();
	const user = await isSignedIn();
	if (!txId || !session || !user)
		return NextResponse.redirect(new URL("/auth/login", process.env.WEB_URL));
	const tx = await consumeMicrosoftOAuthTransaction(txId);
	if (!tx || tx.userId !== user.id) return fail(tx?.publicId ?? "");
	c.delete("microsoft_provider_tx");
	if (
		!validateMicrosoftOAuthState(
			tx.state,
			req.nextUrl.searchParams.get("state"),
		)
	)
		return fail(tx.publicId, "microsoft_oauth_state_invalid");
	if ((await getWorkspaceId()) !== tx.workspaceId)
		return fail(tx.publicId, "microsoft_oauth_workspace_invalid");
	const providerError = req.nextUrl.searchParams.get("error");
	if (providerError) return fail(tx.publicId, "microsoft_oauth_denied");
	const code = req.nextUrl.searchParams.get("code");
	if (!code) return fail(tx.publicId, "microsoft_oauth_code_missing");
	const clientId = process.env.MICROSOFT_CLIENT_ID;
	if (!clientId) return fail(tx.publicId, "microsoft_oauth_not_configured");
	let token: MicrosoftTokenSet;
	try {
		token = await exchangeMicrosoftAuthorizationCode({
			clientId,
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
			code,
			codeVerifier: tx.codeVerifier,
			redirectUri: `${process.env.WEB_URL}/api/oauth/microsoft/callback`,
			tenant: process.env.MICROSOFT_TENANT ?? "common",
		});
	} catch {
		return fail(tx.publicId, "microsoft_oauth_exchange_failed");
	}
	if (!token.refreshToken || !token.idToken)
		return fail(tx.publicId, "microsoft_oauth_identity_missing");
	let claims: Awaited<ReturnType<typeof verifyMicrosoftIdToken>>;
	try {
		claims = await verifyMicrosoftIdToken({
			token: token.idToken,
			clientId,
			nonce: tx.nonce,
		});
	} catch {
		return fail(tx.publicId, "microsoft_oauth_identity_invalid");
	}
	const email = String(claims.email ?? claims.preferred_username ?? "").trim();
	if (!email) return fail(tx.publicId, "microsoft_oauth_identity_missing");
	const config = {
		label: `Microsoft — ${email}`,
		ulid: `microsoft-${email}`,
		SMTP_HOST: "smtp.office365.com",
		SMTP_PORT: "587",
		SMTP_USERNAME: email,
		SMTP_AUTH_METHOD: "xoauth2",
		SMTP_ACCESS_TOKEN: token.accessToken,
		SMTP_TOKEN_EXPIRES_AT: token.expiresAt.toISOString(),
		SMTP_SECURE: "false",
		IMAP_HOST: "outlook.office365.com",
		IMAP_PORT: "993",
		IMAP_USERNAME: email,
		IMAP_AUTH_METHOD: "xoauth2",
		IMAP_ACCESS_TOKEN: token.accessToken,
		IMAP_TOKEN_EXPIRES_AT: token.expiresAt.toISOString(),
		IMAP_SECURE: "true",
		MICROSOFT_REFRESH_TOKEN: token.refreshToken,
		MICROSOFT_TENANT: process.env.MICROSOFT_TENANT ?? "common",
		MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
		MICROSOFT_SCOPES: MICROSOFT_MAIL_SCOPES.join(" "),
	};
	let secretId: string | undefined;
	let accountId: string | undefined;
	try {
		const secret = await createSecret(session, tx.workspaceId, {
			name: config.ulid,
			value: JSON.stringify(config),
			description: "Microsoft OAuth IMAP/SMTP tokens",
			managedBy: "user",
		});
		secretId = secret.id;
		const rls = await rlsClient();
		const [account] = await rls((db) =>
			db
				.insert(smtpAccounts)
				.values({ ownerId: tx.userId, workspaceId: tx.workspaceId })
				.returning(),
		);
		accountId = account.id;
		await rls((db) =>
			db.insert(smtpAccountSecrets).values({
				accountId: account.id,
				secretId: secret.id,
				workspaceId: tx.workspaceId,
			}),
		);
		const identity = await createEmailIdentity({
			email,
			displayName: String(claims.name ?? email),
			smtpAccountId: account.id,
		});
		if (!identity.success) throw new Error("identity_creation_failed");
	} catch {
		const correlationId = crypto.randomUUID();
		const failedAccountId = accountId;
		const failedSecretId = secretId;
		await compensateMicrosoftOAuthResources(correlationId, [
			...(failedAccountId
				? [
						{
							resource: "identities",
							cleanup: async () =>
								(await rlsClient())((db) =>
									db
										.delete(identities)
										.where(eq(identities.smtpAccountId, failedAccountId)),
								),
						},
					]
				: []),
			...(failedAccountId
				? [
						{
							resource: "smtp_account_secrets",
							cleanup: async () =>
								(await rlsClient())((db) =>
									db
										.delete(smtpAccountSecrets)
										.where(eq(smtpAccountSecrets.accountId, failedAccountId)),
								),
						},
					]
				: []),
			...(failedAccountId
				? [
						{
							resource: "smtp_accounts",
							cleanup: async () =>
								(await rlsClient())((db) =>
									db
										.delete(smtpAccounts)
										.where(eq(smtpAccounts.id, failedAccountId)),
								),
						},
					]
				: []),
			...(failedSecretId
				? [
						{
							resource: "secrets_meta",
							cleanup: async () =>
								(await rlsClient())((db) =>
									db
										.delete(secretsMeta)
										.where(eq(secretsMeta.id, failedSecretId)),
								),
						},
					]
				: []),
		]);
		return fail(
			tx.publicId,
			"microsoft_oauth_persistence_failed",
			correlationId,
		);
	}
	return NextResponse.redirect(
		new URL(
			`/w/${tx.publicId}/dashboard/platform/providers?connected=microsoft`,
			process.env.WEB_URL,
		),
	);
}
