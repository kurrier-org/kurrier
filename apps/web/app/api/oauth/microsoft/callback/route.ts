import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSecret, smtpAccounts, smtpAccountSecrets } from "@db";
import { rlsClient } from "@/lib/actions/clients";
import { createEmailIdentity } from "@/lib/actions/email-identity";
import { currentSession } from "@/lib/actions/auth";
import {
	exchangeMicrosoftAuthorizationCode,
	validateMicrosoftOAuthState,
	MICROSOFT_MAIL_SCOPES,
} from "@providers";
const fail = (id: string, msg: string) =>
	NextResponse.redirect(
		new URL(
			`/w/${id}/dashboard/platform/providers?microsoft_error=${encodeURIComponent(msg)}`,
			process.env.WEB_URL,
		),
	);
const claims = (token: string) => {
	try {
		return JSON.parse(
			Buffer.from(token.split(".")[1], "base64url").toString(),
		) as Record<string, unknown>;
	} catch {
		return {};
	}
};
export async function GET(req: NextRequest) {
	const c = await cookies(),
		state = c.get("microsoft_provider_state")?.value,
		verifier = c.get("microsoft_provider_code_verifier")?.value,
		workspaceId = c.get("microsoft_provider_workspace_id")?.value,
		publicId = c.get("microsoft_provider_workspace_public_id")?.value,
		ownerId = c.get("microsoft_provider_owner_id")?.value;
	if (!state || !verifier || !workspaceId || !publicId || !ownerId)
		return NextResponse.redirect(new URL("/auth/login", process.env.WEB_URL));
	if (
		!validateMicrosoftOAuthState(state, req.nextUrl.searchParams.get("state"))
	)
		return fail(publicId, "Microsoft OAuth state validation failed");
	const err = req.nextUrl.searchParams.get("error");
	if (err)
		return fail(
			publicId,
			req.nextUrl.searchParams.get("error_description") ?? err,
		);
	const code = req.nextUrl.searchParams.get("code");
	if (!code) return fail(publicId, "Microsoft authorization code missing");
	let t;
	try {
		t = await exchangeMicrosoftAuthorizationCode({
			clientId: process.env.MICROSOFT_CLIENT_ID!,
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
			code,
			codeVerifier: verifier,
			redirectUri: `${process.env.WEB_URL}/api/oauth/microsoft/callback`,
			tenant: process.env.MICROSOFT_TENANT ?? "common",
		});
	} catch (e) {
		return fail(
			publicId,
			e instanceof Error ? e.message : "Microsoft OAuth token exchange failed",
		);
	}
	if (!t.refreshToken)
		return fail(
			publicId,
			"Microsoft did not return a refresh token. Remove Kurrier access and reconnect.",
		);
	const p = claims(String((t as any).idToken ?? "")),
		email = String(p.email ?? p.preferred_username ?? "").trim();
	if (!email) return fail(publicId, "Microsoft account email missing");
	const config = {
		label: `Microsoft — ${email}`,
		ulid: `microsoft-${email}`,
		SMTP_HOST: "smtp.office365.com",
		SMTP_PORT: "587",
		SMTP_USERNAME: email,
		SMTP_AUTH_METHOD: "xoauth2",
		SMTP_ACCESS_TOKEN: t.accessToken,
		SMTP_TOKEN_EXPIRES_AT: t.expiresAt.toISOString(),
		SMTP_SECURE: "false",
		IMAP_HOST: "outlook.office365.com",
		IMAP_PORT: "993",
		IMAP_USERNAME: email,
		IMAP_AUTH_METHOD: "xoauth2",
		IMAP_ACCESS_TOKEN: t.accessToken,
		IMAP_TOKEN_EXPIRES_AT: t.expiresAt.toISOString(),
		IMAP_SECURE: "true",
		MICROSOFT_REFRESH_TOKEN: t.refreshToken,
		MICROSOFT_TENANT: process.env.MICROSOFT_TENANT ?? "common",
		MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
		MICROSOFT_SCOPES: MICROSOFT_MAIL_SCOPES.join(" "),
	};
	const secret = await createSecret(await currentSession(), workspaceId, {
			name: config.ulid,
			value: JSON.stringify(config),
			description: "Microsoft OAuth IMAP/SMTP tokens",
			managedBy: "user",
		}),
		rls = await rlsClient();
	const accountRows: any = await rls((tx: any) =>
		tx.insert(smtpAccounts).values({ ownerId, workspaceId }).returning(),
	);
	const account = accountRows[0];
	await rls((tx: any) =>
		tx
			.insert(smtpAccountSecrets)
			.values({ accountId: account.id, secretId: secret.id, workspaceId }),
	);
	const identity = await createEmailIdentity({
		email,
		displayName: String(p.name ?? email),
		smtpAccountId: account.id,
	});
	if (!identity.success)
		return fail(
			publicId,
			identity.error ?? "Microsoft mailbox could not be created",
		);
	for (const k of [
		"state",
		"code_verifier",
		"workspace_id",
		"workspace_public_id",
		"owner_id",
	])
		c.delete(`microsoft_provider_${k}`);
	return NextResponse.redirect(
		new URL(
			`/w/${publicId}/dashboard/platform/providers?connected=microsoft`,
			process.env.WEB_URL,
		),
	);
}
