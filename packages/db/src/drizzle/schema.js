"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailboxThreadLabels = exports.labels = exports.webhooks = exports.apiKeys = exports.mailboxThreads = exports.threads = exports.messages = exports.messageAttachments = exports.mailboxSync = exports.mailboxes = exports.identities = exports.smtpAccountSecrets = exports.smtpAccounts = exports.providerSecrets = exports.providers = exports.secretsMeta = exports.WebHookEnum = exports.ApiScopeEnum = exports.mailboxSyncPhaseEnum = exports.MessagePriorityEnum = exports.MessageStateEnum = exports.MailboxKindEnum = exports.IdentityStatusEnum = exports.IdentityKindEnum = exports.ProviderKindEnum = void 0;
// @ts-nocheck
var pg_core_1 = require("drizzle-orm/pg-core");
var supabase_schema_1 = require("./supabase-schema");
var supabase_1 = require("drizzle-orm/supabase");
var drizzle_orm_1 = require("drizzle-orm");
var _schema_1 = require("@schema");
var nanoid_1 = require("nanoid");
exports.ProviderKindEnum = (0, pg_core_1.pgEnum)("provider_kind", _schema_1.providersList);
exports.IdentityKindEnum = (0, pg_core_1.pgEnum)("identity_kind", _schema_1.identityTypesList);
exports.IdentityStatusEnum = (0, pg_core_1.pgEnum)("identity_status", _schema_1.identityStatusList);
exports.MailboxKindEnum = (0, pg_core_1.pgEnum)("mailbox_kind", _schema_1.mailboxKindsList);
exports.MessageStateEnum = (0, pg_core_1.pgEnum)("message_state", _schema_1.messageStatesList);
exports.MessagePriorityEnum = (0, pg_core_1.pgEnum)("message_priority", _schema_1.messagePriorityList);
exports.mailboxSyncPhaseEnum = (0, pg_core_1.pgEnum)("mailbox_sync_phase", _schema_1.mailboxSyncPhase);
exports.ApiScopeEnum = (0, pg_core_1.pgEnum)("api_scope", _schema_1.apiScopeList);
exports.WebHookEnum = (0, pg_core_1.pgEnum)("webhook_list", _schema_1.webHookList);
exports.secretsMeta = (0, pg_core_1.pgTable)("secrets_meta", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    vaultSecret: (0, pg_core_1.uuid)("vault_secret").notNull(),
}, function (t) { return [
    (0, pg_core_1.pgPolicy)("select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.providers = (0, pg_core_1.pgTable)("providers", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    type: (0, exports.ProviderKindEnum)("type").notNull(),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.uniqueIndex)("uniq_provider_per_user").on(t.ownerId, t.type),
    (0, pg_core_1.pgPolicy)("providers_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("providers_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("providers_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("providers_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.providerSecrets = (0, pg_core_1.pgTable)("provider_secrets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    providerId: (0, pg_core_1.uuid)("provider_id")
        .references(function () { return exports.providers.id; }, { onDelete: "cascade" })
        .notNull(),
    secretId: (0, pg_core_1.uuid)("secret_id")
        .references(function () { return exports.secretsMeta.id; }, { onDelete: "cascade" })
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.pgPolicy)("provsec_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n      "], ["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n      "])), exports.providers, t.providerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("provsec_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n        and exists (\n          select 1 from ", " s\n          where s.id = ", "\n            and s.owner_id = ", "\n        )\n      "], ["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n        and exists (\n          select 1 from ", " s\n          where s.id = ", "\n            and s.owner_id = ", "\n        )\n      "])), exports.providers, t.providerId, supabase_1.authUid, exports.secretsMeta, t.secretId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("provsec_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n      "], ["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n      "])), exports.providers, t.providerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n        and exists (\n          select 1 from ", " s\n          where s.id = ", "\n            and s.owner_id = ", "\n        )\n      "], ["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n        and exists (\n          select 1 from ", " s\n          where s.id = ", "\n            and s.owner_id = ", "\n        )\n      "])), exports.providers, t.providerId, supabase_1.authUid, exports.secretsMeta, t.secretId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("provsec_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n      "], ["\n        exists (\n          select 1 from ", " p\n          where p.id = ", "\n            and p.owner_id = ", "\n        )\n      "])), exports.providers, t.providerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.smtpAccounts = (0, pg_core_1.pgTable)("smtp_accounts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.pgPolicy)("smtp_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("smtp_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("smtp_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("smtp_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.smtpAccountSecrets = (0, pg_core_1.pgTable)("smtp_account_secrets", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    accountId: (0, pg_core_1.uuid)("account_id")
        .references(function () { return exports.smtpAccounts.id; }, { onDelete: "cascade" })
        .notNull(),
    secretId: (0, pg_core_1.uuid)("secret_id")
        .references(function () { return exports.secretsMeta.id; }, { onDelete: "cascade" })
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.pgPolicy)("smtpsec_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n      "], ["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n      "])), exports.smtpAccounts, t.accountId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("smtpsec_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n        and exists (select 1 from ", " s\n                    where s.id = ", "\n                      and s.owner_id = ", ")\n      "], ["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n        and exists (select 1 from ", " s\n                    where s.id = ", "\n                      and s.owner_id = ", ")\n      "])), exports.smtpAccounts, t.accountId, supabase_1.authUid, exports.secretsMeta, t.secretId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("smtpsec_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n      "], ["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n      "])), exports.smtpAccounts, t.accountId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject(["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n        and exists (select 1 from ", " s\n                    where s.id = ", "\n                      and s.owner_id = ", ")\n      "], ["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n        and exists (select 1 from ", " s\n                    where s.id = ", "\n                      and s.owner_id = ", ")\n      "])), exports.smtpAccounts, t.accountId, supabase_1.authUid, exports.secretsMeta, t.secretId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("smtpsec_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n      "], ["\n        exists (select 1 from ", " a\n                where a.id = ", "\n                  and a.owner_id = ", ")\n      "])), exports.smtpAccounts, t.accountId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.identities = (0, pg_core_1.pgTable)("identities", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    kind: (0, exports.IdentityKindEnum)("kind").notNull(),
    publicId: (0, pg_core_1.text)("public_id")
        .notNull()
        .$defaultFn(function () { return (0, nanoid_1.nanoid)(10); }),
    value: (0, pg_core_1.text)("value").notNull(), // domain or email address
    incomingDomain: (0, pg_core_1.boolean)("incoming_domain").default(false),
    domainIdentityId: (0, pg_core_1.uuid)("domain_identity_id")
        .references(function () { return exports.identities.id; }, { onDelete: "set null" })
        .default(null),
    dnsRecords: (0, pg_core_1.jsonb)("dns_records").$type().default(null),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    providerId: (0, pg_core_1.uuid)("provider_id").references(function () { return exports.providers.id; }), // SES/SendGrid/Mailgun/Postmark
    smtpAccountId: (0, pg_core_1.uuid)("smtp_account_id").references(function () { return exports.smtpAccounts.id; }), // Custom SMTP
    status: (0, exports.IdentityStatusEnum)("status").notNull().default("unverified"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.uniqueIndex)("uniq_identity_per_user").on(t.ownerId, t.kind, t.value),
    (0, pg_core_1.uniqueIndex)("uniq_identity_public_id").on(t.publicId),
    (0, pg_core_1.pgPolicy)("identities_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("identities_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("identities_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("identities_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.mailboxes = (0, pg_core_1.pgTable)("mailboxes", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    identityId: (0, pg_core_1.uuid)("identity_id")
        .references(function () { return exports.identities.id; }, { onDelete: "cascade" })
        .notNull(),
    parentId: (0, pg_core_1.uuid)("parent_id")
        .references(function () { return exports.mailboxes.id; }, { onDelete: "cascade" })
        .default(null),
    publicId: (0, pg_core_1.text)("public_id")
        .notNull()
        .$defaultFn(function () { return (0, nanoid_1.nanoid)(10); }),
    kind: (0, exports.MailboxKindEnum)("kind").notNull().default("inbox"),
    name: (0, pg_core_1.text)("name"),
    slug: (0, pg_core_1.text)("slug"),
    isDefault: (0, pg_core_1.boolean)("is_default").notNull().default(false),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.uniqueIndex)("uniq_mailbox_public_id").on(t.publicId),
    (0, pg_core_1.uniqueIndex)("uniq_default_mailbox_per_kind")
        .on(t.identityId, t.kind)
        .where((0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject(["", " IS TRUE"], ["", " IS TRUE"])), t.isDefault)),
    (0, pg_core_1.uniqueIndex)("uniq_mailbox_slug_per_identity")
        .on(t.identityId, t.slug)
        .where((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["", " IS NOT NULL"], ["", " IS NOT NULL"])), t.slug)),
    (0, pg_core_1.index)("idx_mailbox_parent").on(t.parentId),
    (0, pg_core_1.pgPolicy)("mailboxes_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_38 || (templateObject_38 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mailboxes_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_39 || (templateObject_39 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mailboxes_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_40 || (templateObject_40 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_41 || (templateObject_41 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mailboxes_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_42 || (templateObject_42 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.mailboxSync = (0, pg_core_1.pgTable)("mailbox_sync", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    identityId: (0, pg_core_1.uuid)("identity_id")
        .references(function () { return exports.identities.id; }, { onDelete: "cascade" })
        .notNull(),
    mailboxId: (0, pg_core_1.uuid)("mailbox_id")
        .references(function () { return exports.mailboxes.id; }, { onDelete: "cascade" })
        .notNull(),
    uidValidity: (0, pg_core_1.bigint)("uid_validity", { mode: "bigint" }).notNull(),
    lastSeenUid: (0, pg_core_1.bigint)("last_seen_uid", { mode: "number" })
        .notNull()
        .default(0),
    backfillCursorUid: (0, pg_core_1.bigint)("backfill_cursor_uid", { mode: "number" })
        .notNull()
        .default(0),
    highestModseq: (0, pg_core_1.numeric)("highest_modseq", { precision: 20, scale: 0 }),
    phase: (0, exports.mailboxSyncPhaseEnum)("phase").notNull().default("BOOTSTRAP"),
    syncedAt: (0, pg_core_1.timestamp)("synced_at", { withTimezone: true }),
    error: (0, pg_core_1.text)("error"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdateFn(function () { return (0, drizzle_orm_1.sql)(templateObject_43 || (templateObject_43 = __makeTemplateObject(["now()"], ["now()"]))); }),
}, function (table) { return ({
    uxMailbox: (0, pg_core_1.uniqueIndex)("ux_mailbox_sync_mailbox").on(table.mailboxId),
    ixIdentity: (0, pg_core_1.index)("ix_mailbox_sync_identity").on(table.identityId),
    ixPhase: (0, pg_core_1.index)("ix_mailbox_sync_phase").on(table.phase),
}); });
exports.messageAttachments = (0, pg_core_1.pgTable)("message_attachments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_44 || (templateObject_44 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    messageId: (0, pg_core_1.uuid)("message_id")
        .references(function () { return exports.messages.id; }, { onDelete: "cascade" })
        .notNull(),
    bucketId: (0, pg_core_1.text)("bucket_id").notNull().default("attachments"),
    path: (0, pg_core_1.text)("path").notNull(), // e.g. "private/<userId>/<messageId>/<uuid>.<ext>"
    filenameOriginal: (0, pg_core_1.text)("filename_original"),
    contentType: (0, pg_core_1.text)("content_type"),
    sizeBytes: (0, pg_core_1.integer)("size_bytes"),
    cid: (0, pg_core_1.text)("cid"),
    isInline: (0, pg_core_1.boolean)("is_inline").notNull().default(false),
    checksum: (0, pg_core_1.text)("checksum"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.index)("idx_msg_attachments_message").on(t.messageId),
    (0, pg_core_1.uniqueIndex)("uniq_bucket_path").on(t.bucketId, t.path),
    (0, pg_core_1.index)("idx_msg_attachments_cid").on(t.cid),
    (0, pg_core_1.pgPolicy)("message_attachments_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_45 || (templateObject_45 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("message_attachments_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_46 || (templateObject_46 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("message_attachments_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_47 || (templateObject_47 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_48 || (templateObject_48 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("message_attachments_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_49 || (templateObject_49 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_50 || (templateObject_50 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    mailboxId: (0, pg_core_1.uuid)("mailbox_id")
        .references(function () { return exports.mailboxes.id; }, { onDelete: "cascade" })
        .notNull(),
    publicId: (0, pg_core_1.text)("public_id")
        .notNull()
        .$defaultFn(function () { return (0, nanoid_1.nanoid)(10); }),
    messageId: (0, pg_core_1.text)("message_id").notNull(),
    inReplyTo: (0, pg_core_1.text)("in_reply_to"),
    references: (0, pg_core_1.text)("references").array(),
    threadId: (0, pg_core_1.uuid)("thread_id")
        .references(function () { return exports.threads.id; }, { onDelete: "cascade" })
        .notNull(),
    replyTo: (0, pg_core_1.jsonb)("reply_to")
        .$type()
        .default((0, drizzle_orm_1.sql)(templateObject_51 || (templateObject_51 = __makeTemplateObject(["'[]'::jsonb"], ["'[]'::jsonb"])))),
    deliveredTo: (0, pg_core_1.text)("delivered_to"),
    priority: (0, exports.MessagePriorityEnum)("priority").default((0, drizzle_orm_1.sql)(templateObject_52 || (templateObject_52 = __makeTemplateObject(["null"], ["null"])))),
    html: (0, pg_core_1.text)("html"),
    subject: (0, pg_core_1.text)("subject"),
    snippet: (0, pg_core_1.text)("snippet"),
    text: (0, pg_core_1.text)("text"),
    textAsHtml: (0, pg_core_1.text)("text_as_html"),
    from: (0, pg_core_1.jsonb)("from").$type().default((0, drizzle_orm_1.sql)(templateObject_53 || (templateObject_53 = __makeTemplateObject(["null"], ["null"])))),
    to: (0, pg_core_1.jsonb)("to").$type().default((0, drizzle_orm_1.sql)(templateObject_54 || (templateObject_54 = __makeTemplateObject(["null"], ["null"])))),
    cc: (0, pg_core_1.jsonb)("cc").$type().default((0, drizzle_orm_1.sql)(templateObject_55 || (templateObject_55 = __makeTemplateObject(["null"], ["null"])))),
    bcc: (0, pg_core_1.jsonb)("bcc").$type().default((0, drizzle_orm_1.sql)(templateObject_56 || (templateObject_56 = __makeTemplateObject(["null"], ["null"])))),
    date: (0, pg_core_1.timestamp)("date", { withTimezone: true }),
    sizeBytes: (0, pg_core_1.integer)("size_bytes"),
    seen: (0, pg_core_1.boolean)("seen").notNull().default(false),
    answered: (0, pg_core_1.boolean)("answered").notNull().default(false),
    flagged: (0, pg_core_1.boolean)("flagged").notNull().default(false),
    draft: (0, pg_core_1.boolean)("draft").notNull().default(false),
    hasAttachments: (0, pg_core_1.boolean)("has_attachments").notNull().default(false),
    state: (0, exports.MessageStateEnum)("state").notNull().default("normal"),
    headersJson: (0, pg_core_1.jsonb)("headers_json")
        .$type()
        .default(null),
    rawStorageKey: (0, pg_core_1.text)("raw_storage_key"),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.uniqueIndex)("uniq_message_public_id").on(t.publicId),
    (0, pg_core_1.index)("idx_messages_priority").on(t.priority),
    (0, pg_core_1.uniqueIndex)("uniq_mailbox_message_id").on(t.mailboxId, t.messageId),
    (0, pg_core_1.index)("idx_messages_in_reply_to").on(t.inReplyTo),
    (0, pg_core_1.index)("ix_messages_thread_flagged").on(t.threadId, t.flagged),
    (0, pg_core_1.index)("idx_messages_mailbox_date").on(t.mailboxId, t.date),
    (0, pg_core_1.index)("idx_messages_mailbox_seen_date").on(t.mailboxId, t.seen, t.date),
    (0, pg_core_1.pgPolicy)("messages_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_57 || (templateObject_57 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("messages_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_58 || (templateObject_58 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("messages_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_59 || (templateObject_59 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_60 || (templateObject_60 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("messages_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_61 || (templateObject_61 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.threads = (0, pg_core_1.pgTable)("threads", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_62 || (templateObject_62 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    lastMessageDate: (0, pg_core_1.timestamp)("last_message_date", { withTimezone: true }), // nullable until first msg written
    lastMessageId: (0, pg_core_1.uuid)("last_message_id")
        .references(function () { return exports.messages.id; }, { onDelete: "set null" })
        .default(null),
    messageCount: (0, pg_core_1.integer)("message_count").notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.index)("idx_threads_owner_lastdate").on(t.ownerId, t.lastMessageDate, t.id),
    (0, pg_core_1.index)("idx_threads_owner_id").on(t.ownerId, t.id),
    (0, pg_core_1.pgPolicy)("threads_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_63 || (templateObject_63 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("threads_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_64 || (templateObject_64 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("threads_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_65 || (templateObject_65 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_66 || (templateObject_66 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("threads_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_67 || (templateObject_67 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.mailboxThreads = (0, pg_core_1.pgTable)("mailbox_threads", {
    threadId: (0, pg_core_1.uuid)("thread_id")
        .references(function () { return exports.threads.id; }, { onDelete: "cascade" })
        .notNull(),
    mailboxId: (0, pg_core_1.uuid)("mailbox_id")
        .references(function () { return exports.mailboxes.id; }, { onDelete: "cascade" })
        .notNull(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_68 || (templateObject_68 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    identityId: (0, pg_core_1.uuid)("identity_id")
        .references(function () { return exports.identities.id; }, { onDelete: "cascade" })
        .notNull(),
    identityPublicId: (0, pg_core_1.text)("identity_public_id").notNull(),
    mailboxSlug: (0, pg_core_1.text)("mailbox_slug"),
    subject: (0, pg_core_1.text)("subject"),
    previewText: (0, pg_core_1.text)("preview_text"), // keep truncation in app/trigger
    lastActivityAt: (0, pg_core_1.timestamp)("last_activity_at", {
        withTimezone: true,
    }).notNull(),
    firstMessageAt: (0, pg_core_1.timestamp)("first_message_at", { withTimezone: true }),
    messageCount: (0, pg_core_1.integer)("message_count").notNull().default(0),
    unreadCount: (0, pg_core_1.integer)("unread_count").notNull().default(0),
    hasAttachments: (0, pg_core_1.boolean)("has_attachments").notNull().default(false),
    starred: (0, pg_core_1.boolean)("starred").notNull().default(false),
    participants: (0, pg_core_1.jsonb)("participants").$type(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, function (t) { return [
    (0, pg_core_1.primaryKey)({
        name: "pk_mailbox_threads",
        columns: [t.threadId, t.mailboxId],
    }),
    (0, pg_core_1.index)("ix_mbth_mailbox_activity").on(t.mailboxId, t.lastActivityAt, t.threadId),
    (0, pg_core_1.index)("ix_mbth_identity_slug").on(t.identityId, t.mailboxSlug),
    (0, pg_core_1.index)("ix_mbth_identity_public_id").on(t.identityPublicId),
    (0, pg_core_1.index)("ix_mbth_mailbox_unread").on(t.mailboxId, t.unreadCount),
    (0, pg_core_1.index)("ix_mbth_mailbox_starred").on(t.mailboxId, t.starred),
    (0, pg_core_1.uniqueIndex)("ux_mbth_thread_mailbox").on(t.threadId, t.mailboxId),
    (0, pg_core_1.pgPolicy)("mbth_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_69 || (templateObject_69 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mbth_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_70 || (templateObject_70 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mbth_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_71 || (templateObject_71 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_72 || (templateObject_72 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mbth_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_73 || (templateObject_73 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.apiKeys = (0, pg_core_1.pgTable)("api_keys", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_74 || (templateObject_74 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    name: (0, pg_core_1.text)("name").notNull(),
    secretId: (0, pg_core_1.uuid)("secret_id")
        .references(function () { return exports.secretsMeta.id; }, { onDelete: "cascade" })
        .notNull(),
    keyPrefix: (0, pg_core_1.text)("key_prefix").notNull(),
    keyLast4: (0, pg_core_1.text)("key_last4").notNull(),
    keyVersion: (0, pg_core_1.integer)("key_version").notNull().default(1),
    scopes: (0, exports.ApiScopeEnum)("scopes").array().notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true }),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at", { withTimezone: true }),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdateFn(function () { return (0, drizzle_orm_1.sql)(templateObject_75 || (templateObject_75 = __makeTemplateObject(["now()"], ["now()"]))); }),
}, function (t) { return [
    (0, pg_core_1.uniqueIndex)("ux_api_keys_owner_name").on(t.ownerId, t.name),
    (0, pg_core_1.uniqueIndex)("ux_api_keys_owner_prefix").on(t.ownerId, t.keyPrefix),
    (0, pg_core_1.index)("ix_api_keys_owner").on(t.ownerId),
    (0, pg_core_1.index)("ix_api_keys_expires").on(t.expiresAt),
    (0, pg_core_1.index)("ix_api_keys_revoked").on(t.revokedAt),
    (0, pg_core_1.pgPolicy)("apikeys_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_76 || (templateObject_76 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("apikeys_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_77 || (templateObject_77 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("apikeys_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_78 || (templateObject_78 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_79 || (templateObject_79 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("apikeys_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_80 || (templateObject_80 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.webhooks = (0, pg_core_1.pgTable)("webhooks", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_81 || (templateObject_81 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    identityId: (0, pg_core_1.uuid)("identity_id")
        .references(function () { return exports.identities.id; }, { onDelete: "set null" })
        .default(null),
    url: (0, pg_core_1.text)("url").notNull(),
    description: (0, pg_core_1.text)("description"),
    events: (0, exports.WebHookEnum)("events").array().notNull(),
    enabled: (0, pg_core_1.boolean)("enabled").notNull().default(true),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.index)("ix_webhooks_owner").on(t.ownerId),
    (0, pg_core_1.index)("ix_webhooks_identity").on(t.identityId),
    (0, pg_core_1.index)("ix_webhooks_enabled").on(t.enabled),
    (0, pg_core_1.pgPolicy)("webhooks_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_82 || (templateObject_82 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("webhooks_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_83 || (templateObject_83 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("webhooks_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_84 || (templateObject_84 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_85 || (templateObject_85 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("webhooks_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_86 || (templateObject_86 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.labels = (0, pg_core_1.pgTable)("labels", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_87 || (templateObject_87 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    publicId: (0, pg_core_1.text)("public_id")
        .notNull()
        .$defaultFn(function () { return (0, nanoid_1.nanoid)(10); }),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull(),
    parentId: (0, pg_core_1.uuid)("parent_id")
        .references(function () { return exports.labels.id; }, { onDelete: "cascade" })
        .default(null),
    colorBg: (0, pg_core_1.text)("color_bg"),
    colorText: (0, pg_core_1.text)("color_text"),
    isSystem: (0, pg_core_1.boolean)("is_system").notNull().default(false),
    metaData: (0, pg_core_1.jsonb)("meta").$type().default(null),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.uniqueIndex)("uniq_label_owner_slug").on(t.ownerId, t.slug),
    (0, pg_core_1.pgPolicy)("labels_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_88 || (templateObject_88 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("labels_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_89 || (templateObject_89 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("labels_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_90 || (templateObject_90 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_91 || (templateObject_91 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("labels_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_92 || (templateObject_92 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
exports.mailboxThreadLabels = (0, pg_core_1.pgTable)("mailbox_thread_labels", {
    threadId: (0, pg_core_1.uuid)("thread_id")
        .references(function () { return exports.threads.id; }, { onDelete: "cascade" })
        .notNull(),
    mailboxId: (0, pg_core_1.uuid)("mailbox_id")
        .references(function () { return exports.mailboxes.id; }, { onDelete: "cascade" })
        .notNull(),
    labelId: (0, pg_core_1.uuid)("label_id")
        .references(function () { return exports.labels.id; }, { onDelete: "cascade" })
        .notNull(),
    ownerId: (0, pg_core_1.uuid)("owner_id")
        .references(function () { return supabase_schema_1.users.id; })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_93 || (templateObject_93 = __makeTemplateObject(["auth.uid()"], ["auth.uid()"])))),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, function (t) { return [
    (0, pg_core_1.primaryKey)({
        name: "pk_mailbox_thread_labels",
        columns: [t.threadId, t.mailboxId, t.labelId],
    }),
    (0, pg_core_1.index)("ix_mbtlabel_mailbox_label").on(t.mailboxId, t.labelId),
    (0, pg_core_1.index)("ix_mbtlabel_label").on(t.labelId),
    (0, pg_core_1.pgPolicy)("mbtlabel_select_own", {
        for: "select",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_94 || (templateObject_94 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mbtlabel_insert_own", {
        for: "insert",
        to: supabase_1.authenticatedRole,
        withCheck: (0, drizzle_orm_1.sql)(templateObject_95 || (templateObject_95 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mbtlabel_update_own", {
        for: "update",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_96 || (templateObject_96 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
        withCheck: (0, drizzle_orm_1.sql)(templateObject_97 || (templateObject_97 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
    (0, pg_core_1.pgPolicy)("mbtlabel_delete_own", {
        for: "delete",
        to: supabase_1.authenticatedRole,
        using: (0, drizzle_orm_1.sql)(templateObject_98 || (templateObject_98 = __makeTemplateObject(["", " = ", ""], ["", " = ", ""])), t.ownerId, supabase_1.authUid),
    }),
]; }).enableRLS();
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37, templateObject_38, templateObject_39, templateObject_40, templateObject_41, templateObject_42, templateObject_43, templateObject_44, templateObject_45, templateObject_46, templateObject_47, templateObject_48, templateObject_49, templateObject_50, templateObject_51, templateObject_52, templateObject_53, templateObject_54, templateObject_55, templateObject_56, templateObject_57, templateObject_58, templateObject_59, templateObject_60, templateObject_61, templateObject_62, templateObject_63, templateObject_64, templateObject_65, templateObject_66, templateObject_67, templateObject_68, templateObject_69, templateObject_70, templateObject_71, templateObject_72, templateObject_73, templateObject_74, templateObject_75, templateObject_76, templateObject_77, templateObject_78, templateObject_79, templateObject_80, templateObject_81, templateObject_82, templateObject_83, templateObject_84, templateObject_85, templateObject_86, templateObject_87, templateObject_88, templateObject_89, templateObject_90, templateObject_91, templateObject_92, templateObject_93, templateObject_94, templateObject_95, templateObject_96, templateObject_97, templateObject_98;
