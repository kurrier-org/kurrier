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

// export const SmtpVerifySchema = z.object({
//     host: z.string(),
//     port: z.coerce.number(),
//     secure: z.enum(["true", "false"]).transform(val => val === "true").optional(), // true => 465 (implicit TLS)
//     auth: z.object({
//         user: z.string(),
//         pass: z.string(),
//     }),
//     pool: z.enum(["true", "false"]).transform(val => val === "true").optional(),
//     imap: z.object({
//         host: z.string(),
//         port: z.coerce.number(),
//         user: z.string(),
//         pass: z.string(),
//         secure: z.enum(["true", "false"]).transform(val => val === "true"),
//     }).optional(),
// });
// export type SmtpVerifyInput = z.infer<typeof SmtpVerifySchema>;

// export type MailAddress = string | { name?: string; address: string };
//
// export type Mail = {
//     to: MailAddress | MailAddress[];
//     from: MailAddress;
//     subject: string;
//     text?: string;
//     html?: string;
//     headers?: Record<string, string>;
// };

// export type SendResult = {
//     id?: string;
//     accepted?: string[];
//     rejected?: string[];
//     provider?: Providers;
//     meta?: Record<string, unknown>;
// };

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
		opts?: { subject?: string; body?: string },
	): Promise<boolean>;
	addDomain(
		domain: string,
		mailFrom?: string,
		incoming?: boolean,
	): Promise<DomainIdentity>;
	addEmail(email: string, objectKeyPrefix: string, metaData?: Record<any, any>): Promise<EmailIdentity>;
	removeEmail(
		ruleSetName: string,
		ruleName: string,
	): Promise<{ removed: boolean }>;
	removeDomain(domain: string): Promise<DomainIdentity>;
	verifyDomain(domain: string): Promise<DomainIdentity>;
	// send?(mail: Mail): Promise<SendResult>;
	// close?(): Promise<void>;
}
