"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderAccountFormSchema = exports.DomainIdentityFormSchema = exports.SmtpAccountFormSchema = void 0;
// @ts-nocheck
var zod_1 = require("zod");
var isFQDN_1 = require("validator/lib/isFQDN");
var cleanKV = function (obj) {
    return Object.fromEntries(Object.entries(obj !== null && obj !== void 0 ? obj : {}).filter(function (_a) {
        var v = _a[1];
        return v !== "" && v != null;
    }));
};
exports.SmtpAccountFormSchema = zod_1.z.object({
    ulid: zod_1.z.string().min(1, "ULID is required"),
    secretId: zod_1.z.string().optional().nullable(),
    accountId: zod_1.z.string().optional().nullable(),
    label: zod_1.z.string().trim().min(1, "Account label is required"),
    // Explicitly pass keyType + valueType to avoid overload confusion
    required: zod_1.z
        .record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.null()]))
        .optional()
        .default({})
        .transform(cleanKV),
    optional: zod_1.z
        .record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.null()]))
        .optional()
        .default({})
        .transform(cleanKV),
});
var isDomain = function (s) {
    return (0, isFQDN_1.default)(s, {
        require_tld: true,
        allow_underscores: false,
        allow_trailing_dot: false,
        allow_numeric_tld: true,
        allow_wildcard: false,
    });
};
var isSubdomain = function (s) {
    return (0, isFQDN_1.default)(s, {
        // subdomain can be like "mail.example.com" or just "mail"
        require_tld: false,
        allow_underscores: false,
        allow_trailing_dot: false,
        allow_numeric_tld: true,
        allow_wildcard: false,
    });
};
exports.DomainIdentityFormSchema = zod_1.z.object({
    providerOption: zod_1.z.string().min(1, "Provider selection is required"),
    value: zod_1.z
        .string()
        .min(1, "Domain name is required")
        .refine(isDomain, { message: "Must be a valid domain (e.g. example.com)" }),
    providerId: zod_1.z.string().optional().nullable(),
    kind: zod_1.z.literal("domain"),
    mailFromSubdomain: zod_1.z
        .string()
        .trim()
        .optional()
        .refine(function (v) { return !v || isSubdomain(v); }, {
        message: "Must be a valid subdomain (e.g. mail.example.com or mail)",
    }),
    incomingDomain: zod_1.z.enum(["true", "false"]).optional(),
});
exports.ProviderAccountFormSchema = zod_1.z.object({
    ulid: zod_1.z.string().min(1, "ULID is required"),
    providerId: zod_1.z.string().min(1, "ProviderId is required"),
    // Required env vars: dynamic object of string values
    required: zod_1.z.record(zod_1.z.string(), zod_1.z.string().min(1, "Value is required")),
});
