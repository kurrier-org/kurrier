import { z } from "zod";

export const providersList = [
	"smtp",
	"ses",
	"mailgun",
	"postmark",
	"sendgrid",
    "jmap"
] as const;
export const ProvidersEnum = z.enum(providersList);
export type Providers = z.infer<typeof ProvidersEnum>;

export const ProviderLabels: Record<Providers, string> = {
	smtp: "Generic SMTP",
	ses: "Amazon SES",
	mailgun: "Mailgun",
	postmark: "Postmark",
	sendgrid: "SendGrid",
	jmap: "Generic JMAP",
};

export type ProviderSpec = {
	key: Exclude<Providers, "smtp">;
	name: string;
	docsUrl: string;
	requiredEnv: string[];
};

export const PROVIDERS: ProviderSpec[] = [
	{
		key: "ses",
		name: ProviderLabels.ses,
		docsUrl: "https://docs.aws.amazon.com/ses/latest/dg/Welcome.html",
		requiredEnv: [
			"SES_ACCESS_KEY_ID",
			"SES_SECRET_ACCESS_KEY",
			"SES_REGION",
			// "SES_FROM_EMAIL",
		],
	},
	{
		key: "sendgrid",
		name: ProviderLabels.sendgrid,
		docsUrl: "https://docs.sendgrid.com/",
		requiredEnv: ["SENDGRID_API_KEY"],
	},
	{
		key: "mailgun",
		name: ProviderLabels.mailgun,
		docsUrl: "https://documentation.mailgun.com/",
		requiredEnv: ["MAILGUN_API_KEY"],
	},
	{
		key: "postmark",
		name: ProviderLabels.postmark,
		docsUrl: "https://postmarkapp.com/developer",
		requiredEnv: ["POSTMARK_SERVER_TOKEN", "POSTMARK_ACCOUNT_TOKEN"],
	},
];

export const SMTP_SPEC = {
	key: "smtp" as const,
	name: ProviderLabels.smtp,
	docsUrl: "https://www.rfc-editor.org/rfc/rfc5321",
	requiredEnv: [
		"SMTP_HOST",
		"SMTP_PORT",
		"SMTP_USERNAME",
		"SMTP_PASSWORD",
		"SMTP_SECURE", // true => implicit TLS(465); false/empty => STARTTLS (587)
		// "SMTP_FROM_EMAIL",
		"SMTP_POOL",
	] as const,
	optionalEnv: [
		// "SMTP_FROM_NAME",
		"IMAP_HOST",
		"IMAP_PORT",
		"IMAP_USERNAME",
		"IMAP_PASSWORD",
		"IMAP_SECURE",
	] as const,
	help:
		"Works with most mail hosts. IMAP vars are optional and only needed if you plan to receive/sync messages. "
};


export const JMAP_SPEC = {
    key: "jmap" as const,
    name: ProviderLabels.jmap,
    docsUrl: "https://datatracker.ietf.org/doc/html/rfc8620",
    requiredEnv: [
        "JMAP_HOST",
        "JMAP_PORT",
        "JMAP_USERNAME",
        "JMAP_PASSWORD",
    ] as const,
    optionalEnv: [] as const,
    help:
        "Works with any JMAP-compatible email server. Provide host, port, and credentials to connect via JMAP protocol.",
};
