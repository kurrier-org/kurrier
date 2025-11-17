"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawPostmarkConfigSchema =
	exports.RawMailgunConfigSchema =
	exports.RawSendgridConfigSchema =
	exports.RawSesConfigSchema =
	exports.RawSmtpConfigSchema =
		void 0;
var zod_1 = require("zod");
exports.RawSmtpConfigSchema = zod_1.z
	.object({
		SMTP_HOST: zod_1.z.string(),
		SMTP_PORT: zod_1.z.coerce.number(),
		SMTP_SECURE: zod_1.z
			.enum(["true", "false"])
			.transform(function (v) {
				return v === "true";
			})
			.optional(),
		SMTP_USERNAME: zod_1.z.string(),
		SMTP_PASSWORD: zod_1.z.string(),
		SMTP_POOL: zod_1.z
			.enum(["true", "false"])
			.transform(function (v) {
				return v === "true";
			})
			.optional(),
		IMAP_HOST: zod_1.z.string().optional(),
		IMAP_PORT: zod_1.z.coerce.number().optional(),
		IMAP_USERNAME: zod_1.z.string().optional(),
		IMAP_PASSWORD: zod_1.z.string().optional(),
		IMAP_SECURE: zod_1.z
			.enum(["true", "false"])
			.transform(function (v) {
				return v === "true";
			})
			.optional(),
	})
	.transform(function (r) {
		var _a, _b;
		return {
			host: r.SMTP_HOST,
			port: r.SMTP_PORT,
			secure: (_a = r.SMTP_SECURE) !== null && _a !== void 0 ? _a : false,
			auth: { user: r.SMTP_USERNAME, pass: r.SMTP_PASSWORD },
			pool: r.SMTP_POOL,
			imap:
				r.IMAP_HOST && r.IMAP_PORT && r.IMAP_USERNAME && r.IMAP_PASSWORD
					? {
							host: r.IMAP_HOST,
							port: r.IMAP_PORT,
							user: r.IMAP_USERNAME,
							pass: r.IMAP_PASSWORD,
							secure:
								(_b = r.IMAP_SECURE) !== null && _b !== void 0 ? _b : true,
						}
					: undefined,
		};
	});
exports.RawSesConfigSchema = zod_1.z
	.object({
		SES_ACCESS_KEY_ID: zod_1.z.string(),
		SES_SECRET_ACCESS_KEY: zod_1.z.string(),
		SES_REGION: zod_1.z.string(),
	})
	.transform(function (r) {
		return {
			accessKeyId: r.SES_ACCESS_KEY_ID,
			secretAccessKey: r.SES_SECRET_ACCESS_KEY,
			region: r.SES_REGION,
		};
	});
exports.RawSendgridConfigSchema = zod_1.z
	.object({
		SENDGRID_API_KEY: zod_1.z.string(),
	})
	.transform(function (r) {
		return {
			sendgridApiKey: r.SENDGRID_API_KEY,
		};
	});
exports.RawMailgunConfigSchema = zod_1.z
	.object({
		MAILGUN_API_KEY: zod_1.z.string(),
	})
	.transform(function (r) {
		return {
			mailgunApiKey: r.MAILGUN_API_KEY,
		};
	});
exports.RawPostmarkConfigSchema = zod_1.z
	.object({
		POSTMARK_SERVER_TOKEN: zod_1.z.string(),
		POSTMARK_ACCOUNT_TOKEN: zod_1.z.string(),
	})
	.transform(function (r) {
		return {
			postmarkServerToken: r.POSTMARK_SERVER_TOKEN,
			postmarkAccountToken: r.POSTMARK_ACCOUNT_TOKEN,
		};
	});
