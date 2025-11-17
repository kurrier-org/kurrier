"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTP_MAILBOXES = exports.SYSTEM_MAILBOXES = exports.MessageStateDisplay = exports.MessageStateEnum = exports.messagePriorityList = exports.mailboxSyncPhase = exports.messageStatesList = exports.MailboxKindDisplay = exports.MailboxKindEnum = exports.mailboxKindsList = void 0;
var zod_1 = require("zod");
exports.mailboxKindsList = [
    "inbox",
    "sent",
    "drafts",
    "archive",
    "spam",
    "trash",
    "outbox",
    "custom",
];
exports.MailboxKindEnum = zod_1.z.enum(exports.mailboxKindsList);
exports.MailboxKindDisplay = {
    inbox: "Inbox",
    sent: "Sent",
    drafts: "Drafts",
    archive: "Archive",
    spam: "Spam",
    trash: "Trash",
    outbox: "Outbox",
    custom: "Custom Folder",
};
//
// Message states
//
exports.messageStatesList = [
    "normal",
    "bounced",
    "queued",
    "failed",
];
exports.mailboxSyncPhase = ["BOOTSTRAP", "BACKFILL", "IDLE"];
exports.messagePriorityList = ["low", "medium", "high"];
exports.MessageStateEnum = zod_1.z.enum(exports.messageStatesList);
exports.MessageStateDisplay = {
    normal: "Normal",
    bounced: "Bounced",
    queued: "Queued",
    failed: "Failed",
};
exports.SYSTEM_MAILBOXES = [
    { kind: "inbox", isDefault: true }, // entrypoint
    { kind: "sent", isDefault: false },
    { kind: "trash", isDefault: false },
    { kind: "spam", isDefault: false },
];
exports.SMTP_MAILBOXES = [{ kind: "inbox", isDefault: true }];
