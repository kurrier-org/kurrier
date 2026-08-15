import crypto from "node:crypto";
import { db, decryptAdminSecrets, smtpAccountSecrets, smtpAccounts } from "@db";
import type { SmtpAccountCreateInput, SmtpAccountUpdateInput } from "@schema";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";

// Secrets are stored with the same env-style keys the dashboard form
// produces (see SMTP_SPEC in @schema), so accounts created through the
// API and through the UI stay interchangeable.
export type StoredSmtpConfig = Record<string, string>;

const boolToString = (v: boolean | undefined) =>
	v === undefined ? undefined : v ? "true" : "false";

function cleanConfig(config: Record<string, string | undefined>) {
	return Object.fromEntries(
		Object.entries(config).filter(([, v]) => v !== undefined && v !== ""),
	) as StoredSmtpConfig;
}

export function smtpConfigFromInput(
	input: SmtpAccountCreateInput,
	base?: { ulid?: string; label?: string },
): StoredSmtpConfig {
	return cleanConfig({
		ulid: base?.ulid ?? crypto.randomUUID(),
		label: base?.label ?? input.label,
		SMTP_HOST: input.smtp.host,
		SMTP_PORT: String(input.smtp.port),
		SMTP_USERNAME: input.smtp.username,
		SMTP_PASSWORD: input.smtp.password,
		SMTP_SECURE: boolToString(input.smtp.secure),
		SMTP_POOL: boolToString(input.smtp.pool),
		IMAP_HOST: input.imap?.host,
		IMAP_PORT: input.imap ? String(input.imap.port) : undefined,
		IMAP_USERNAME: input.imap?.username,
		IMAP_PASSWORD: input.imap?.password,
		IMAP_SECURE: boolToString(input.imap?.secure),
	});
}

export function applySmtpConfigUpdate(
	existing: StoredSmtpConfig,
	input: SmtpAccountUpdateInput,
): StoredSmtpConfig {
	const next: Record<string, string | undefined> = { ...existing };

	if (input.label !== undefined) next.label = input.label;

	if (input.smtp) {
		if (input.smtp.host !== undefined) next.SMTP_HOST = input.smtp.host;
		if (input.smtp.port !== undefined) next.SMTP_PORT = String(input.smtp.port);
		if (input.smtp.username !== undefined)
			next.SMTP_USERNAME = input.smtp.username;
		if (input.smtp.password !== undefined)
			next.SMTP_PASSWORD = input.smtp.password;
		if (input.smtp.secure !== undefined)
			next.SMTP_SECURE = boolToString(input.smtp.secure);
		if (input.smtp.pool !== undefined)
			next.SMTP_POOL = boolToString(input.smtp.pool);
	}

	if (input.imap === null) {
		delete next.IMAP_HOST;
		delete next.IMAP_PORT;
		delete next.IMAP_USERNAME;
		delete next.IMAP_PASSWORD;
		delete next.IMAP_SECURE;
	} else if (input.imap) {
		if (input.imap.host !== undefined) next.IMAP_HOST = input.imap.host;
		if (input.imap.port !== undefined) next.IMAP_PORT = String(input.imap.port);
		if (input.imap.username !== undefined)
			next.IMAP_USERNAME = input.imap.username;
		if (input.imap.password !== undefined)
			next.IMAP_PASSWORD = input.imap.password;
		if (input.imap.secure !== undefined)
			next.IMAP_SECURE = boolToString(input.imap.secure);
	}

	return cleanConfig(next);
}

// Passwords never leave the API: only connection metadata is exposed.
export function serializeSmtpAccount(
	account: {
		id: string;
		ownerId: string;
		workspaceId: string;
		createdAt: Date | string;
		updatedAt: Date | string;
	},
	config: StoredSmtpConfig | null,
) {
	return {
		id: account.id,
		ownerId: account.ownerId,
		workspaceId: account.workspaceId,
		label: config?.label ?? null,
		smtp: config?.SMTP_HOST
			? {
					host: config.SMTP_HOST,
					port: config.SMTP_PORT ? Number(config.SMTP_PORT) : null,
					username: config.SMTP_USERNAME ?? null,
					secure: config.SMTP_SECURE === "true",
					pool: config.SMTP_POOL === "true",
				}
			: null,
		imap: config?.IMAP_HOST
			? {
					host: config.IMAP_HOST,
					port: config.IMAP_PORT ? Number(config.IMAP_PORT) : null,
					username: config.IMAP_USERNAME ?? null,
					secure: config.IMAP_SECURE !== "false",
				}
			: null,
		sendVerified: (config as Record<string, unknown>)?.sendVerified ?? null,
		receiveVerified:
			(config as Record<string, unknown>)?.receiveVerified ?? null,
		createdAt: account.createdAt,
		updatedAt: account.updatedAt,
	};
}

// ownerId null = admin API key: no ownership filter, any account resolves.
export async function validateSmtpAccountOwnership(opts: {
	accountId: string;
	ownerId: string | null;
}) {
	const [account] = await db
		.select()
		.from(smtpAccounts)
		.where(
			opts.ownerId === null
				? eq(smtpAccounts.id, opts.accountId)
				: and(
						eq(smtpAccounts.id, opts.accountId),
						eq(smtpAccounts.ownerId, opts.ownerId),
					),
		)
		.limit(1);

	if (!account) {
		throw createError({
			statusCode: 404,
			statusMessage: "SMTP account not found or access denied",
		});
	}

	return account;
}

export async function getSmtpAccountSecret(opts: {
	accountId: string;
	ownerId: string;
}) {
	const [row] = await decryptAdminSecrets({
		linkTable: smtpAccountSecrets,
		foreignCol: smtpAccountSecrets.accountId,
		secretIdCol: smtpAccountSecrets.secretId,
		ownerId: opts.ownerId,
		parentId: opts.accountId,
	});

	if (!row) return null;

	const config: StoredSmtpConfig = row.vault?.decrypted_secret
		? JSON.parse(row.vault.decrypted_secret)
		: {};

	return { secretId: row.metaId, config };
}
