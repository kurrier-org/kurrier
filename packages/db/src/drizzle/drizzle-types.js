"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelInsertSchema = exports.IdentityUpdateSchema = exports.WebhookCreateSchema = exports.WebhookUpdateSchema = exports.CommonProviderEntitySchema = exports.SMTPAccountSchema = exports.ProviderSchema = exports.MailboxSyncInsertSchema = exports.MessageAttachmentInsertSchema = exports.ThreadInsertSchema = exports.MessageInsertSchema = exports.MailboxUpdateSchema = exports.MailboxInsertSchema = exports.IdentityInsertSchema = void 0;
var schema_1 = require("./schema");
var zod_1 = require("zod");
var drizzle_zod_1 = require("drizzle-zod");
exports.IdentityInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.identities);
exports.MailboxInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.mailboxes);
exports.MailboxUpdateSchema = (0, drizzle_zod_1.createUpdateSchema)(schema_1.mailboxes);
exports.MessageInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.messages);
exports.ThreadInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.threads);
exports.MessageAttachmentInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.messageAttachments);
exports.MailboxSyncInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.mailboxSync);
exports.ProviderSchema = (0, drizzle_zod_1.createSelectSchema)(schema_1.providers);
exports.SMTPAccountSchema = (0, drizzle_zod_1.createSelectSchema)(schema_1.smtpAccounts);
exports.CommonProviderEntitySchema = zod_1.z.union([
    exports.ProviderSchema,
    exports.SMTPAccountSchema,
]);
exports.WebhookUpdateSchema = (0, drizzle_zod_1.createUpdateSchema)(schema_1.webhooks);
exports.WebhookCreateSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.webhooks);
exports.IdentityUpdateSchema = (0, drizzle_zod_1.createUpdateSchema)(schema_1.identities);
exports.LabelInsertSchema = (0, drizzle_zod_1.createInsertSchema)(schema_1.labels);
