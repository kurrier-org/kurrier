// @ts-nocheck
import {
	pgTable,
	uuid,
	text,
	timestamp,
	pgPolicy,
	pgEnum,
	uniqueIndex,
	boolean,
	jsonb,
	integer,
	index,
	bigint,
	numeric,
	primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./supabase-schema";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";
import { sql } from "drizzle-orm";
import {
	AddressObjectJSON,
	apiScopeList,
	identityStatusList,
	identityTypesList,
	mailboxKindsList,
	mailboxSyncPhase,
	messagePriorityList,
	messageStatesList,
	providersList,
	webHookList,
} from "@schema";
import { DnsRecord } from "@providers";
import { nanoid } from "nanoid";

export const ProviderKindEnum = pgEnum("provider_kind", providersList);

export const IdentityKindEnum = pgEnum("identity_kind", identityTypesList);
export const IdentityStatusEnum = pgEnum("identity_status", identityStatusList);
export const MailboxKindEnum = pgEnum("mailbox_kind", mailboxKindsList);
export const MessageStateEnum = pgEnum("message_state", messageStatesList);
export const MessagePriorityEnum = pgEnum(
	"message_priority",
	messagePriorityList,
);
export const mailboxSyncPhaseEnum = pgEnum(
	"mailbox_sync_phase",
	mailboxSyncPhase,
);

export const ApiScopeEnum = pgEnum("api_scope", apiScopeList);
export const WebHookEnum = pgEnum("webhook_list", webHookList);

export const secretsMeta = pgTable(
	"secrets_meta",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),
		name: text("name").notNull(),
		description: text("description"),
		vaultSecret: uuid("vault_secret").notNull(),
	},
	(t) => [
		pgPolicy("select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const providers = pgTable(
	"providers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),
		type: ProviderKindEnum("type").notNull(),
		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_provider_per_user").on(t.ownerId, t.type),
		pgPolicy("providers_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("providers_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("providers_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("providers_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const providerSecrets = pgTable(
	"provider_secrets",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		providerId: uuid("provider_id")
			.references(() => providers.id, { onDelete: "cascade" })
			.notNull(),
		secretId: uuid("secret_id")
			.references(() => secretsMeta.id, { onDelete: "cascade" })
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		pgPolicy("provsec_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`
        exists (
          select 1 from ${providers} p
          where p.id = ${t.providerId}
            and p.owner_id = ${authUid}
        )
      `,
		}),
		pgPolicy("provsec_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`
        exists (
          select 1 from ${providers} p
          where p.id = ${t.providerId}
            and p.owner_id = ${authUid}
        )
        and exists (
          select 1 from ${secretsMeta} s
          where s.id = ${t.secretId}
            and s.owner_id = ${authUid}
        )
      `,
		}),
		pgPolicy("provsec_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`
        exists (
          select 1 from ${providers} p
          where p.id = ${t.providerId}
            and p.owner_id = ${authUid}
        )
      `,
			withCheck: sql`
        exists (
          select 1 from ${providers} p
          where p.id = ${t.providerId}
            and p.owner_id = ${authUid}
        )
        and exists (
          select 1 from ${secretsMeta} s
          where s.id = ${t.secretId}
            and s.owner_id = ${authUid}
        )
      `,
		}),
		pgPolicy("provsec_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`
        exists (
          select 1 from ${providers} p
          where p.id = ${t.providerId}
            and p.owner_id = ${authUid}
        )
      `,
		}),
	],
).enableRLS();

export const smtpAccounts = pgTable(
	"smtp_accounts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		pgPolicy("smtp_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("smtp_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("smtp_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("smtp_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const smtpAccountSecrets = pgTable(
	"smtp_account_secrets",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		accountId: uuid("account_id")
			.references(() => smtpAccounts.id, { onDelete: "cascade" })
			.notNull(),
		secretId: uuid("secret_id")
			.references(() => secretsMeta.id, { onDelete: "cascade" })
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		pgPolicy("smtpsec_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`
        exists (select 1 from ${smtpAccounts} a
                where a.id = ${t.accountId}
                  and a.owner_id = ${authUid})
      `,
		}),
		pgPolicy("smtpsec_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`
        exists (select 1 from ${smtpAccounts} a
                where a.id = ${t.accountId}
                  and a.owner_id = ${authUid})
        and exists (select 1 from ${secretsMeta} s
                    where s.id = ${t.secretId}
                      and s.owner_id = ${authUid})
      `,
		}),
		pgPolicy("smtpsec_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`
        exists (select 1 from ${smtpAccounts} a
                where a.id = ${t.accountId}
                  and a.owner_id = ${authUid})
      `,
			withCheck: sql`
        exists (select 1 from ${smtpAccounts} a
                where a.id = ${t.accountId}
                  and a.owner_id = ${authUid})
        and exists (select 1 from ${secretsMeta} s
                    where s.id = ${t.secretId}
                      and s.owner_id = ${authUid})
      `,
		}),
		pgPolicy("smtpsec_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`
        exists (select 1 from ${smtpAccounts} a
                where a.id = ${t.accountId}
                  and a.owner_id = ${authUid})
      `,
		}),
	],
).enableRLS();

export const identities = pgTable(
	"identities",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		kind: IdentityKindEnum("kind").notNull(),
		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		value: text("value").notNull(), // domain or email address
		incomingDomain: boolean("incoming_domain").default(false),

		domainIdentityId: uuid("domain_identity_id")
			.references(() => identities.id, { onDelete: "set null" })
			.default(null),

		dnsRecords: jsonb("dns_records").$type<DnsRecord[] | null>().default(null),
		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),
		providerId: uuid("provider_id").references(() => providers.id), // SES/SendGrid/Mailgun/Postmark
		smtpAccountId: uuid("smtp_account_id").references(() => smtpAccounts.id), // Custom SMTP

		status: IdentityStatusEnum("status").notNull().default("unverified"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_identity_per_user").on(t.ownerId, t.kind, t.value),
		uniqueIndex("uniq_identity_public_id").on(t.publicId),

		pgPolicy("identities_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("identities_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("identities_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("identities_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const mailboxes = pgTable(
	"mailboxes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),
		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "cascade" })
			.notNull(),
		parentId: uuid("parent_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.default(null),
		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),
		kind: MailboxKindEnum("kind").notNull().default("inbox"),
		name: text("name"),
		slug: text("slug"),
		isDefault: boolean("is_default").notNull().default(false),
		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_mailbox_public_id").on(t.publicId),
		uniqueIndex("uniq_default_mailbox_per_kind")
			.on(t.identityId, t.kind)
			.where(sql`${t.isDefault} IS TRUE`),
		uniqueIndex("uniq_mailbox_slug_per_identity")
			.on(t.identityId, t.slug)
			.where(sql`${t.slug} IS NOT NULL`),

		index("idx_mailbox_parent").on(t.parentId),

		pgPolicy("mailboxes_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mailboxes_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mailboxes_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mailboxes_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const mailboxSync = pgTable(
	"mailbox_sync",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "cascade" })
			.notNull(),
		mailboxId: uuid("mailbox_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.notNull(),

		uidValidity: bigint("uid_validity", { mode: "bigint" }).notNull(),
		lastSeenUid: bigint("last_seen_uid", { mode: "number" })
			.notNull()
			.default(0),
		backfillCursorUid: bigint("backfill_cursor_uid", { mode: "number" })
			.notNull()
			.default(0),

		highestModseq: numeric("highest_modseq", { precision: 20, scale: 0 }),

		phase: mailboxSyncPhaseEnum("phase").notNull().default("BOOTSTRAP"),
		syncedAt: timestamp("synced_at", { withTimezone: true }),
		error: text("error"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => sql`now()`),
	},
	(table) => ({
		uxMailbox: uniqueIndex("ux_mailbox_sync_mailbox").on(table.mailboxId),
		ixIdentity: index("ix_mailbox_sync_identity").on(table.identityId),
		ixPhase: index("ix_mailbox_sync_phase").on(table.phase),
	}),
);

export const messageAttachments = pgTable(
	"message_attachments",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		messageId: uuid("message_id")
			.references(() => messages.id, { onDelete: "cascade" })
			.notNull(),

		bucketId: text("bucket_id").notNull().default("attachments"),
		path: text("path").notNull(), // e.g. "private/<userId>/<messageId>/<uuid>.<ext>"

		filenameOriginal: text("filename_original"),
		contentType: text("content_type"),
		sizeBytes: integer("size_bytes"),

		cid: text("cid"),
		isInline: boolean("is_inline").notNull().default(false),
		checksum: text("checksum"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("idx_msg_attachments_message").on(t.messageId),
		uniqueIndex("uniq_bucket_path").on(t.bucketId, t.path),
		index("idx_msg_attachments_cid").on(t.cid),

		pgPolicy("message_attachments_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("message_attachments_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("message_attachments_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("message_attachments_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),
		mailboxId: uuid("mailbox_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.notNull(),
		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		messageId: text("message_id").notNull(),
		inReplyTo: text("in_reply_to"),
		references: text("references").array(),
		threadId: uuid("thread_id")
			.references(() => threads.id, { onDelete: "cascade" })
			.notNull(),
		replyTo: jsonb("reply_to")
			.$type<Array<{ name?: string; email: string }>>()
			.default(sql`'[]'::jsonb`),
		deliveredTo: text("delivered_to"),
		priority: MessagePriorityEnum("priority").default(sql`null`),
		html: text("html"),

		subject: text("subject"),
		snippet: text("snippet"),

		text: text("text"),
		textAsHtml: text("text_as_html"),

		from: jsonb("from").$type<AddressObjectJSON | null>().default(sql`null`),
		to: jsonb("to").$type<AddressObjectJSON | null>().default(sql`null`),
		cc: jsonb("cc").$type<AddressObjectJSON | null>().default(sql`null`),
		bcc: jsonb("bcc").$type<AddressObjectJSON | null>().default(sql`null`),

		date: timestamp("date", { withTimezone: true }),
		sizeBytes: integer("size_bytes"),

		seen: boolean("seen").notNull().default(false),
		answered: boolean("answered").notNull().default(false),
		flagged: boolean("flagged").notNull().default(false),

		draft: boolean("draft").notNull().default(false),
		hasAttachments: boolean("has_attachments").notNull().default(false),
		state: MessageStateEnum("state").notNull().default("normal"),
		headersJson: jsonb("headers_json")
			.$type<Record<string, string> | null>()
			.default(null),
		rawStorageKey: text("raw_storage_key"),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_message_public_id").on(t.publicId),
		index("idx_messages_priority").on(t.priority),

		uniqueIndex("uniq_mailbox_message_id").on(t.mailboxId, t.messageId),
		index("idx_messages_in_reply_to").on(t.inReplyTo),

		index("ix_messages_thread_flagged").on(t.threadId, t.flagged),

		index("idx_messages_mailbox_date").on(t.mailboxId, t.date),
		index("idx_messages_mailbox_seen_date").on(t.mailboxId, t.seen, t.date),

		pgPolicy("messages_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("messages_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("messages_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("messages_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const threads = pgTable(
	"threads",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		lastMessageDate: timestamp("last_message_date", { withTimezone: true }), // nullable until first msg written
		lastMessageId: uuid("last_message_id")
			.references(() => messages.id, { onDelete: "set null" })
			.default(null),

		messageCount: integer("message_count").notNull().default(0),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("idx_threads_owner_lastdate").on(t.ownerId, t.lastMessageDate, t.id),
		index("idx_threads_owner_id").on(t.ownerId, t.id),

		pgPolicy("threads_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("threads_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("threads_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("threads_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const mailboxThreads = pgTable(
	"mailbox_threads",
	{
		threadId: uuid("thread_id")
			.references(() => threads.id, { onDelete: "cascade" })
			.notNull(),

		mailboxId: uuid("mailbox_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.notNull(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "cascade" })
			.notNull(),

		identityPublicId: text("identity_public_id").notNull(),
		mailboxSlug: text("mailbox_slug"),

		subject: text("subject"),
		previewText: text("preview_text"), // keep truncation in app/trigger

		lastActivityAt: timestamp("last_activity_at", {
			withTimezone: true,
		}).notNull(),
		firstMessageAt: timestamp("first_message_at", { withTimezone: true }),

		messageCount: integer("message_count").notNull().default(0),
		unreadCount: integer("unread_count").notNull().default(0),

		hasAttachments: boolean("has_attachments").notNull().default(false),
		starred: boolean("starred").notNull().default(false),

		participants: jsonb("participants").$type<{
			from?: { n?: string; e: string }[];
			to?: { n?: string; e: string }[];
			cc?: { n?: string; e: string }[];
			bcc?: { n?: string; e: string }[];
		}>(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},

	(t) => [
		primaryKey({
			name: "pk_mailbox_threads",
			columns: [t.threadId, t.mailboxId],
		}),

		index("ix_mbth_mailbox_activity").on(
			t.mailboxId,
			t.lastActivityAt,
			t.threadId,
		),

		index("ix_mbth_identity_slug").on(t.identityId, t.mailboxSlug),
		index("ix_mbth_identity_public_id").on(t.identityPublicId),

		index("ix_mbth_mailbox_unread").on(t.mailboxId, t.unreadCount),
		index("ix_mbth_mailbox_starred").on(t.mailboxId, t.starred),

		uniqueIndex("ux_mbth_thread_mailbox").on(t.threadId, t.mailboxId),

		pgPolicy("mbth_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mbth_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mbth_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mbth_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		name: text("name").notNull(),

		secretId: uuid("secret_id")
			.references(() => secretsMeta.id, { onDelete: "cascade" })
			.notNull(),

		keyPrefix: text("key_prefix").notNull(),
		keyLast4: text("key_last4").notNull(),

		keyVersion: integer("key_version").notNull().default(1),

		scopes: ApiScopeEnum("scopes").array().notNull(),

		expiresAt: timestamp("expires_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => sql`now()`),
	},
	(t) => [
		uniqueIndex("ux_api_keys_owner_name").on(t.ownerId, t.name),
		uniqueIndex("ux_api_keys_owner_prefix").on(t.ownerId, t.keyPrefix),

		index("ix_api_keys_owner").on(t.ownerId),
		index("ix_api_keys_expires").on(t.expiresAt),
		index("ix_api_keys_revoked").on(t.revokedAt),

		pgPolicy("apikeys_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("apikeys_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("apikeys_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("apikeys_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const webhooks = pgTable(
	"webhooks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "set null" })
			.default(null),

		url: text("url").notNull(),
		description: text("description"),

		events: WebHookEnum("events").array().notNull(),

		enabled: boolean("enabled").notNull().default(true),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_webhooks_owner").on(t.ownerId),
		index("ix_webhooks_identity").on(t.identityId),
		index("ix_webhooks_enabled").on(t.enabled),

		pgPolicy("webhooks_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("webhooks_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("webhooks_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("webhooks_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const labels = pgTable(
	"labels",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		name: text("name").notNull(),
		slug: text("slug").notNull(),

		parentId: uuid("parent_id")
			.references(() => labels.id, { onDelete: "cascade" })
			.default(null),

		colorBg: text("color_bg"),
		colorText: text("color_text"),

		isSystem: boolean("is_system").notNull().default(false),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_label_owner_slug").on(t.ownerId, t.slug),

		pgPolicy("labels_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("labels_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("labels_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("labels_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();

export const mailboxThreadLabels = pgTable(
	"mailbox_thread_labels",
	{
		threadId: uuid("thread_id")
			.references(() => threads.id, { onDelete: "cascade" })
			.notNull(),

		mailboxId: uuid("mailbox_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.notNull(),

		labelId: uuid("label_id")
			.references(() => labels.id, { onDelete: "cascade" })
			.notNull(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		primaryKey({
			name: "pk_mailbox_thread_labels",
			columns: [t.threadId, t.mailboxId, t.labelId],
		}),

		index("ix_mbtlabel_mailbox_label").on(t.mailboxId, t.labelId),
		index("ix_mbtlabel_label").on(t.labelId),

		pgPolicy("mbtlabel_select_own", {
			for: "select",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mbtlabel_insert_own", {
			for: "insert",
			to: authenticatedRole,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mbtlabel_update_own", {
			for: "update",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
			withCheck: sql`${t.ownerId} = ${authUid}`,
		}),
		pgPolicy("mbtlabel_delete_own", {
			for: "delete",
			to: authenticatedRole,
			using: sql`${t.ownerId} = ${authUid}`,
		}),
	],
).enableRLS();
