import type { IdentityStatus } from "@schema";
import { z } from "zod";

export type VerifyResult = {
	ok: boolean;
	message?: string;
	meta?: Record<string, unknown>;
};
const AuthMethod = z.enum(["password", "xoauth2"]);
export const RawSmtpConfigSchema = z
	.object({
		SMTP_HOST: z.string(),
		SMTP_PORT: z.coerce.number(),
		SMTP_SECURE: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),
		SMTP_USERNAME: z.string(),
		SMTP_PASSWORD: z.string().optional(),
		SMTP_POOL: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),
		SMTP_AUTH_METHOD: AuthMethod.optional(),
		SMTP_ACCESS_TOKEN: z.string().optional(),
		SMTP_TOKEN_EXPIRES_AT: z.string().datetime().optional(),
		IMAP_HOST: z.string().optional(),
		IMAP_PORT: z.coerce.number().optional(),
		IMAP_USERNAME: z.string().optional(),
		IMAP_PASSWORD: z.string().optional(),
		IMAP_SECURE: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),
		IMAP_AUTH_METHOD: AuthMethod.optional(),
		IMAP_ACCESS_TOKEN: z.string().optional(),
		IMAP_TOKEN_EXPIRES_AT: z.string().datetime().optional(),
	})
	.superRefine((r, ctx) => {
		if ((r.SMTP_AUTH_METHOD ?? "password") === "password" && !r.SMTP_PASSWORD)
			ctx.addIssue({
				code: "custom",
				path: ["SMTP_PASSWORD"],
				message: "SMTP_PASSWORD is required for password authentication",
			});
		if (r.SMTP_AUTH_METHOD === "xoauth2" && !r.SMTP_ACCESS_TOKEN)
			ctx.addIssue({
				code: "custom",
				path: ["SMTP_ACCESS_TOKEN"],
				message: "SMTP_ACCESS_TOKEN is required for XOAUTH2 authentication",
			});
		if (r.IMAP_AUTH_METHOD === "xoauth2" && !r.IMAP_ACCESS_TOKEN)
			ctx.addIssue({
				code: "custom",
				path: ["IMAP_ACCESS_TOKEN"],
				message: "IMAP_ACCESS_TOKEN is required for XOAUTH2 authentication",
			});
	})
	.transform((r) => ({
		host: r.SMTP_HOST,
		port: r.SMTP_PORT,
		secure: r.SMTP_SECURE ?? false,
		auth:
			r.SMTP_AUTH_METHOD === "xoauth2"
				? {
						type: "OAuth2" as const,
						user: r.SMTP_USERNAME,
						accessToken: r.SMTP_ACCESS_TOKEN!,
					}
				: { user: r.SMTP_USERNAME, pass: r.SMTP_PASSWORD! },
		pool: r.SMTP_POOL,
		imap:
			r.IMAP_HOST &&
			r.IMAP_PORT &&
			r.IMAP_USERNAME &&
			(r.IMAP_AUTH_METHOD === "xoauth2" ? r.IMAP_ACCESS_TOKEN : r.IMAP_PASSWORD)
				? {
						host: r.IMAP_HOST,
						port: r.IMAP_PORT,
						user: r.IMAP_USERNAME,
						pass: r.IMAP_PASSWORD,
						accessToken: r.IMAP_ACCESS_TOKEN,
						secure: r.IMAP_SECURE ?? true,
						authMethod: r.IMAP_AUTH_METHOD ?? "password",
					}
				: undefined,
	}));
export type SmtpVerifyInput = z.infer<typeof RawSmtpConfigSchema>;
export const RawSesConfigSchema = z
	.object({
		SES_ACCESS_KEY_ID: z.string(),
		SES_SECRET_ACCESS_KEY: z.string(),
		SES_REGION: z.string(),
	})
	.transform((r) => ({
		accessKeyId: r.SES_ACCESS_KEY_ID,
		secretAccessKey: r.SES_SECRET_ACCESS_KEY,
		region: r.SES_REGION,
	}));

export type SesConfig = z.infer<typeof RawSesConfigSchema>;

export const RawSendgridConfigSchema = z
	.object({
		SENDGRID_API_KEY: z.string(),
	})
	.transform((r) => ({
		sendgridApiKey: r.SENDGRID_API_KEY,
	}));

export type SendgridConfig = z.infer<typeof RawSendgridConfigSchema>;

export const RawMailgunConfigSchema = z
	.object({
		MAILGUN_API_KEY: z.string(),
	})
	.transform((r) => ({
		mailgunApiKey: r.MAILGUN_API_KEY,
	}));

export type MailgunConfig = z.infer<typeof RawMailgunConfigSchema>;

export const RawPostmarkConfigSchema = z
	.object({
		POSTMARK_SERVER_TOKEN: z.string(),
		POSTMARK_ACCOUNT_TOKEN: z.string(),
	})
	.transform((r) => ({
		postmarkServerToken: r.POSTMARK_SERVER_TOKEN,
		postmarkAccountToken: r.POSTMARK_ACCOUNT_TOKEN,
	}));

export type PostmarkConfig = z.infer<typeof RawPostmarkConfigSchema>;

export type DnsType = "TXT" | "CNAME" | "MX";
export type DnsRecord = {
	type: DnsType;
	name: string;
	value: string;
	ttl?: number;
	priority?: number;
	note?: string;
};

export type DomainIdentity = {
	domain: string;
	status: IdentityStatus;
	dns: DnsRecord[];
	meta?: Record<string, any>;
};

export type EmailIdentity = {
	address: string;
	ruleName: string;
	ruleSetName: string;
	created: boolean;
	slug: string;
};

export interface Mailer {
	verify(id: string, metaData?: Record<any, any>): Promise<VerifyResult>;
	sendTestEmail(
		to: string,
		opts?: { subject?: string; body?: string; from?: string },
	): Promise<boolean>;
	sendEmail(
		to: string[],
		opts: {
			cc?: string[];
			bcc?: string[];
			subject: string;
			text: string;
			html: string;
			from: string;
			inReplyTo: string;
			references: string[];
			attachments?: { name: string; content: Blob; contentType: string }[];
		},
	): Promise<{ success: boolean; MessageId?: string; error?: string }>;
	addDomain(domain: string, opts: Record<any, any>): Promise<DomainIdentity>;
	addEmail(
		email: string,
		objectKeyPrefix: string,
		metaData?: Record<any, any>,
	): Promise<EmailIdentity>;
	removeEmail(
		email: string,
		opts: Record<any, any>,
	): Promise<{ removed: boolean }>;
	removeDomain(domain: string): Promise<DomainIdentity>;
	verifyDomain(
		domain: string,
		opts?: Record<any, any>,
	): Promise<DomainIdentity>;
}

export type AddBucketResult = {
	ok: boolean;
	message?: string;
	meta?: Record<string, unknown>;
};

export type ListPathEntry = {
	type: "folder" | "file";
	name: string;
	path: string;
	sizeBytes?: number;
	etag?: string | null;
	lastModified?: string | null;
};

export type ListPathResult = {
	ok: boolean;
	message?: string;
	meta?: Record<string, unknown>;
	data?: {
		bucket: string;
		prefix: string;
		path: string;
		entries: ListPathEntry[];
		nextToken?: string | null;
	};
};

export type DeleteEntryResult = {
	ok: boolean;
	message: string;
	meta?: Record<string, any>;
};

export type DownloadResult = {
	ok: boolean;
	message: string;
	meta?: Record<string, any>;
	data?: { url: string; expiresIn: number };
};

export type UploadUrlResult =
	| {
			ok: true;
			message: string;
			meta: any;
			data: {
				url: string;
				expiresIn: number;
				method: "PUT";
				headers: Record<string, string>;
			};
	  }
	| { ok: false; message: string; meta?: any };

export type AddFolderResult = {
	ok: boolean;
	message: string;
	meta?: Record<string, any>;
	data?: {
		bucket: string;
		path: string;
		prefix: string;
	};
};

export interface StorageProvider {
	verify(id: string, metaData?: Record<any, any>): Promise<VerifyResult>;
	addBucket(
		id: string,
		input: { bucket: string; makePublicBlocked?: boolean },
	): Promise<AddBucketResult>;
	listPath(
		id: string,
		input: {
			bucket: string;
			path?: string;
			maxKeys?: number;
			continuationToken?: string | null;
		},
	): Promise<ListPathResult>;

	deleteEntry(
		id: string,
		input: { bucket: string; path: string; type: "file" | "folder" },
	): Promise<DeleteEntryResult>;
	downloadUrl(
		id: string,
		input: { bucket: string; path: string; expiresIn?: number },
	): Promise<DownloadResult>;

	uploadUrl(
		id: string,
		input: {
			bucket: string;
			path: string;
			expiresIn?: number;
			contentType?: string | null;
			cacheControl?: string | null;
			contentDisposition?: string | null;
			metadata?: Record<string, string> | null;
		},
	): Promise<UploadUrlResult>;

	addFolder(
		id: string,
		input: { bucket: string; path: string },
	): Promise<AddFolderResult>;
}

export const RawGoogleConfigSchema = z
	.union([
		z.string(),
		z.object({
			GOOGLE_IDENTITY_ID: z.string().optional(),
			identityId: z.string().optional(),
		}),
	])
	.transform((r) => {
		if (typeof r === "string") return { identityId: r };

		return {
			identityId: r.identityId ?? r.GOOGLE_IDENTITY_ID ?? "",
		};
	})
	.refine((r) => r.identityId.length > 0, {
		message: "Google identityId is required",
	});

export type GoogleConfig = z.infer<typeof RawGoogleConfigSchema>;

export const RawJmapConfigSchema = z
	.object({
		token: z.string(),
		sessionUrl: z.string().url(),
		accountId: z.string(),
		username: z.string(),
	})
	.refine((r) => r.token.length > 0, {
		message: "JMAP token is required",
	})
	.refine((r) => r.accountId.length > 0, {
		message: "JMAP accountId is required",
	})
	.refine((r) => r.username.length > 0, {
		message: "JMAP username is required",
	});

export type JmapConfig = z.infer<typeof RawJmapConfigSchema>;
