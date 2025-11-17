"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTP_SPEC = exports.PROVIDERS = exports.ProviderLabels = exports.ProvidersEnum = exports.providersList = void 0;
var zod_1 = require("zod");
exports.providersList = [
    "smtp",
    "ses",
    "mailgun",
    "postmark",
    "sendgrid",
];
exports.ProvidersEnum = zod_1.z.enum(exports.providersList);
/** UI label for each provider key */
exports.ProviderLabels = {
    smtp: "Generic SMTP",
    ses: "Amazon SES",
    mailgun: "Mailgun",
    postmark: "Postmark",
    sendgrid: "SendGrid",
};
/** Catalog for API providers (non-SMTP) */
exports.PROVIDERS = [
    {
        key: "ses",
        name: exports.ProviderLabels.ses,
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
        name: exports.ProviderLabels.sendgrid,
        docsUrl: "https://docs.sendgrid.com/",
        requiredEnv: ["SENDGRID_API_KEY"],
    },
    {
        key: "mailgun",
        name: exports.ProviderLabels.mailgun,
        docsUrl: "https://documentation.mailgun.com/",
        requiredEnv: ["MAILGUN_API_KEY"],
    },
    {
        key: "postmark",
        name: exports.ProviderLabels.postmark,
        docsUrl: "https://postmarkapp.com/developer",
        requiredEnv: ["POSTMARK_SERVER_TOKEN", "POSTMARK_ACCOUNT_TOKEN"],
    },
];
/** SMTP block used by the SMTP card */
exports.SMTP_SPEC = {
    key: "smtp",
    name: exports.ProviderLabels.smtp,
    docsUrl: "https://www.rfc-editor.org/rfc/rfc5321",
    requiredEnv: [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "SMTP_SECURE", // true => implicit TLS(465); false/empty => STARTTLS (587)
        // "SMTP_FROM_EMAIL",
        "SMTP_POOL",
    ],
    optionalEnv: [
        // "SMTP_FROM_NAME",
        "IMAP_HOST",
        "IMAP_PORT",
        "IMAP_USERNAME",
        "IMAP_PASSWORD",
        "IMAP_SECURE",
    ],
    help: "Works with cPanel, Office365, and most mail hosts. Provide host, port, and credentials. " +
        "Use SMTP_SECURE=true for implicit TLS (port 465); leave empty/false for STARTTLS (587). " +
        "IMAP vars are optional and only needed if you plan to receive/sync messages.",
};
