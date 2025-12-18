import type { Providers } from "@schema";
import { Mailer, StorageProvider } from "./core";
import { SmtpMailer } from "./mail/smtp";
import { SesMailer } from "./mail/ses";
import { SendgridMailer } from "./mail/sendgrid";
import { MailgunMailer } from "./mail/mailgun";
import { PostmarkMailer } from "./mail/postmark";

import { S3Store } from "./store/s3";

export function createMailer(provider: Providers, config: unknown): Mailer {
	switch (provider) {
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
