import type { Providers } from "@schema";
import type { Mailer, StorageProvider } from "./core";
import { GoogleMailer } from "./mail/google";
import { JmapMailer } from "./mail/jmap";
import { MailgunMailer } from "./mail/mailgun";
import { PostmarkMailer } from "./mail/postmark";
import { SendgridMailer } from "./mail/sendgrid";
import { SesMailer } from "./mail/ses";
import { SmtpMailer } from "./mail/smtp";
import { S3Store } from "./store/s3";

export function createMailer(provider: Providers, config: unknown): Mailer {
	switch (provider) {
		case "google":
			return GoogleMailer.from(config);
		case "jmap":
			return JmapMailer.from(config);
		case "smtp":
			return SmtpMailer.from(config);
		case "ses":
			return SesMailer.from(config);
		case "sendgrid":
			return SendgridMailer.from(config);
		case "mailgun":
			return MailgunMailer.from(config);
		case "postmark":
			return PostmarkMailer.from(config);
		default:
			throw new Error(`Provider not implemented: ${provider}`);
	}
}

export function createStore(
	provider: Providers,
	config: unknown,
): StorageProvider {
	switch (provider) {
		case "s3":
			return S3Store.from(config);
		default:
			throw new Error(`Provider not implemented: ${provider}`);
	}
}

export * from "./core";
export * from "./mail/google-client";

export * from "./mail/microsoft-oauth";
