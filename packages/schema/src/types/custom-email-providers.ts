import { z } from "zod";

const CustomEmailServerSchema = z
	.object({
		host: z.string().trim().min(1, "Host is required"),
		port: z.number().int().min(1).max(65535),
		secure: z.boolean(),
	})
	.strict();

const CustomEmailSmtpServerSchema = CustomEmailServerSchema.extend({
	pool: z.boolean().optional(),
}).strict();

export const CustomEmailProviderSchema = z
	.object({
		id: z
			.string()
			.trim()
			.regex(
				/^[a-z0-9][a-z0-9_-]*$/,
				"Provider id must contain only lowercase letters, numbers, underscores, and hyphens",
			),
		name: z.string().trim().min(1, "Provider name is required"),
		description: z.string().trim().min(1).optional(),
		credentialMode: z.enum(["shared", "separate"]),
		smtp: CustomEmailSmtpServerSchema,
		imap: CustomEmailServerSchema.optional(),
	})
	.strict();

export type CustomEmailProvider = z.infer<typeof CustomEmailProviderSchema>;

export const CustomEmailProviderCredentialsSchema = z.discriminatedUnion(
	"credentialMode",
	[
		z.object({
			ulid: z.string().min(1, "ULID is required"),
			presetId: z.string().min(1, "Preset id is required"),
			credentialMode: z.literal("shared"),
			username: z.string().trim().email("A valid mailbox email is required"),
			password: z.string().min(1, "Password is required"),
		}),
		z.object({
			ulid: z.string().min(1, "ULID is required"),
			presetId: z.string().min(1, "Preset id is required"),
			credentialMode: z.literal("separate"),
			smtpUsername: z
				.string()
				.trim()
				.email("A valid SMTP mailbox email is required"),
			smtpPassword: z.string().min(1, "SMTP password is required"),
			imapUsername: z.string().trim().optional(),
			imapPassword: z.string().optional(),
		}),
	],
);

export type CustomEmailProviderCredentials = z.infer<
	typeof CustomEmailProviderCredentialsSchema
>;

export type MaterializedSmtpConfig = Record<string, string> & {
	ulid: string;
	label: string;
	SMTP_HOST: string;
	SMTP_PORT: string;
	SMTP_SECURE: string;
	SMTP_POOL: string;
	SMTP_USERNAME: string;
	SMTP_PASSWORD: string;
};

type Warn = (message: string) => void;

/** Parse non-secret instance-level email provider presets from an environment variable. */
export function parseCustomEmailProviders(
	raw: string | undefined,
	warn: Warn = console.warn,
): CustomEmailProvider[] {
	if (!raw?.trim()) return [];

	let input: unknown;
	try {
		input = JSON.parse(raw);
	} catch {
		warn(
			"[CUSTOM_EMAIL_PROVIDERS] Ignoring configuration: value is not valid JSON",
		);
		return [];
	}

	if (!Array.isArray(input)) {
		warn(
			"[CUSTOM_EMAIL_PROVIDERS] Ignoring configuration: expected a JSON array",
		);
		return [];
	}

	const providers: CustomEmailProvider[] = [];
	const ids = new Set<string>();

	input.forEach((candidate, index) => {
		const parsed = CustomEmailProviderSchema.safeParse(candidate);
		if (!parsed.success) {
			warn(
				`[CUSTOM_EMAIL_PROVIDERS] Skipping invalid provider at index ${index}: ${z.prettifyError(parsed.error)}`,
			);
			return;
		}

		if (ids.has(parsed.data.id)) {
			warn(
				`[CUSTOM_EMAIL_PROVIDERS] Skipping duplicate provider id "${parsed.data.id}" at index ${index}`,
			);
			return;
		}

		ids.add(parsed.data.id);
		providers.push(parsed.data);
	});

	return providers;
}

/** Build the existing encrypted SMTP/IMAP account payload from a trusted preset. */
export function materializeCustomEmailProvider(
	provider: CustomEmailProvider,
	credentials: CustomEmailProviderCredentials,
): MaterializedSmtpConfig {
	if (provider.id !== credentials.presetId) {
		throw new Error(
			"Selected email provider does not match submitted credentials",
		);
	}

	if (provider.credentialMode !== credentials.credentialMode) {
		throw new Error(
			"Email provider credential mode has changed; reopen the form",
		);
	}

	const smtpUsername =
		credentials.credentialMode === "shared"
			? credentials.username
			: credentials.smtpUsername;
	const smtpPassword =
		credentials.credentialMode === "shared"
			? credentials.password
			: credentials.smtpPassword;

	const config: MaterializedSmtpConfig = {
		ulid: credentials.ulid,
		label: `${provider.name} (${smtpUsername})`,
		SMTP_HOST: provider.smtp.host,
		SMTP_PORT: String(provider.smtp.port),
		SMTP_SECURE: String(provider.smtp.secure),
		SMTP_POOL: String(provider.smtp.pool ?? false),
		SMTP_USERNAME: smtpUsername,
		SMTP_PASSWORD: smtpPassword,
	};

	if (!provider.imap) return config;

	const imapUsername =
		credentials.credentialMode === "shared"
			? credentials.username
			: credentials.imapUsername;
	const imapPassword =
		credentials.credentialMode === "shared"
			? credentials.password
			: credentials.imapPassword;

	if (!imapUsername || !imapPassword) {
		throw new Error(
			"IMAP username and password are required for this provider",
		);
	}

	config.IMAP_HOST = provider.imap.host;
	config.IMAP_PORT = String(provider.imap.port);
	config.IMAP_SECURE = String(provider.imap.secure);
	config.IMAP_USERNAME = imapUsername;
	config.IMAP_PASSWORD = imapPassword;

	return config;
}
