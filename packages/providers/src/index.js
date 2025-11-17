"use strict";
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (
					!desc ||
					("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
				) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __exportStar =
	(this && this.__exportStar) ||
	function (m, exports) {
		for (var p in m)
			if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
				__createBinding(exports, m, p);
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMailer = createMailer;
var smtp_1 = require("./mail/smtp");
var ses_1 = require("./mail/ses");
var sendgrid_1 = require("./mail/sendgrid");
var mailgun_1 = require("./mail/mailgun");
var postmark_1 = require("./mail/postmark");
function createMailer(provider, config) {
	switch (provider) {
		case "smtp":
			return smtp_1.SmtpMailer.from(config);
		case "ses":
			return ses_1.SesMailer.from(config);
		case "sendgrid":
			return sendgrid_1.SendgridMailer.from(config);
		case "mailgun":
			return mailgun_1.MailgunMailer.from(config);
		case "postmark":
			return postmark_1.PostmarkMailer.from(config);
		// Add others when you implement them:
		// case "ses": return SesMailer.from(config)
		// case "sendgrid": return SendgridMailer.from(config)
		default:
			throw new Error("Provider not implemented: ".concat(provider));
	}
}
__exportStar(require("./core"), exports);
