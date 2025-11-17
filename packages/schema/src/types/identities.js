"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityStatusMeta = exports.IdentityStatusDisplay = exports.IdentityStatusEnum = exports.IdentitesEnum = exports.identityStatusList = exports.identityTypesList = void 0;
var zod_1 = require("zod");
exports.identityTypesList = ["domain", "email"];
exports.identityStatusList = [
    "unverified",
    "pending",
    "verified",
    "failed",
];
exports.IdentitesEnum = zod_1.z.enum(exports.identityTypesList);
exports.IdentityStatusEnum = zod_1.z.enum(exports.identityStatusList);
exports.IdentityStatusDisplay = {
    unverified: "Not verified",
    pending: "DNS not set up yet",
    verified: "Verified",
    failed: "Verification failed",
};
exports.IdentityStatusMeta = {
    unverified: {
        label: "Not verified",
        note: "Verification has not been initiated yet.",
    },
    pending: {
        label: "DNS not set up yet",
        note: "Add DNS records at your DNS host to continue verification.",
    },
    verified: {
        label: "Verified",
        note: "This identity is fully verified and ready to use.",
    },
    failed: {
        label: "Verification failed",
        note: "Check your DNS records or restart the verification process.",
    },
};
