import { z } from "zod";
import { IdentityStatus } from "@schema";

export type VerifyResult = {
	ok: boolean;
	message?: string;
	meta?: Record<string, unknown>;
};

export const RawSmtpConfigSchema = z
	.object({
		SMTP_HOST: z.string(),
		SMTP_PORT: z.coerce.number(),
		SMTP_SECURE: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),

		SMTP_USERNAME: z.string(),
		SMTP_PASSWORD: z.string(),
		SMTP_POOL: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),

		IMAP_HOST: z.string().optional(),
		IMAP_PORT: z.coerce.number().optional(),
		IMAP_USERNAME: z.string().optional(),
		IMAP_PASSWORD: z.string().optional(),
		IMAP_SECURE: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),
	})
	.transform((r) => ({
		host: r.SMTP_HOST,
		port: r.SMTP_PORT,
		secure: r.SMTP_SECURE ?? false,
		auth: { user: r.SMTP_USERNAME, pass: r.SMTP_PASSWORD },
		pool: r.SMTP_POOL,

		imap:
			r.IMAP_HOST && r.IMAP_PORT && r.IMAP_USERNAME && r.IMAP_PASSWORD
				? {
						host: r.IMAP_HOST,
						port: r.IMAP_PORT,
						user: r.IMAP_USERNAME,
						pass: r.IMAP_PASSWORD,
						secure: r.IMAP_SECURE ?? true,
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
