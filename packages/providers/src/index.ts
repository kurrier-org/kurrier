import type { Providers } from "@schema";
import type { Mailer } from "./core";
import { SmtpMailer } from "./mail/smtp";
import { SesMailer } from "./mail/ses";
import { SendgridMailer } from "./mail/sendgrid";
import { MailgunMailer } from "./mail/mailgun";
import { PostmarkMailer } from "./mail/postmark";

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
		// Add others when you implement them:
		// case "ses": return SesMailer.from(config)
		// case "sendgrid": return SendgridMailer.from(config)
		default:
			throw new Error(`Provider not implemented: ${provider}`);
	}
}

export * from "./core";
