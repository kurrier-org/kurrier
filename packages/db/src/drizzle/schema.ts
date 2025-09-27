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
    pgSchema,
    bigint, numeric
} from "drizzle-orm/pg-core";
import { users } from "./supabase-schema";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";
import { sql } from "drizzle-orm";
import {
    AddressObjectJSON,
    identityStatusList,
    identityTypesList,
    mailboxKindsList, mailboxSyncPhase,
    messagePriorityList,
    messageStatesList,
    providersList,
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
export const mailboxSyncPhaseEnum = pgEnum("mailbox_sync_phase", mailboxSyncPhase);

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
		// keyName: varchar("key_name", { length: 120 }).notNull(),
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
		// uniqueIndex("uniq_smtp_label_per_user").on(t.ownerId, t.label),
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
		// RLS via ownership of the parent account + ownership of the secret
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
		// avoid duplicates per user for same kind+value
		uniqueIndex("uniq_identity_per_user").on(t.ownerId, t.kind, t.value),
		// uniqueIndex("uniq_identity_per_user").on(t.ownerId, t.kind, t.value),
		uniqueIndex("uniq_identity_public_id").on(t.publicId),

		// RLS: standard owner controls
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

        // IMAP cursors / invariants
        uidValidity: bigint("uid_validity", { mode: "bigint" }).notNull(),
        lastSeenUid: bigint("last_seen_uid", { mode: "number" }).notNull().default(0),
        backfillCursorUid: bigint("backfill_cursor_uid", { mode: "number" }).notNull().default(0),

        // CONDSTORE/QRESYNC: allow very large modseq as exact integer
        highestModseq: numeric("highest_modseq", { precision: 20, scale: 0 }),

        // Worker state
        phase: mailboxSyncPhaseEnum("phase").notNull().default("BOOTSTRAP"),
        syncedAt: timestamp("synced_at", { withTimezone: true }),
        error: text("error"),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            // keep updatedAt fresh on UPDATEs
            .$onUpdateFn(() => sql`now()`),
    },
    (table) => ({
        // Ensure exactly one sync row per mailbox
        uxMailbox: uniqueIndex("ux_mailbox_sync_mailbox").on(table.mailboxId),
        // Helpful indexes for queries
        ixIdentity: index("ix_mailbox_sync_identity").on(table.identityId),
        ixPhase: index("ix_mailbox_sync_phase").on(table.phase),
    })
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

		// Storage location
		bucketId: text("bucket_id").notNull().default("attachments"),
		path: text("path").notNull(), // e.g. "private/<userId>/<messageId>/<uuid>.<ext>"

		// Metadata
		filenameOriginal: text("filename_original"),
		contentType: text("content_type"),
		sizeBytes: integer("size_bytes"),

		// Inline/CID support
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

		// RLS: owner can CRUD their own attachments
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
		// messageId: text("message_id"),
		inReplyTo: text("in_reply_to"),
		references: text("references").array(),
		threadId: uuid("thread_id")
			.references(() => threads.id, { onDelete: "cascade" })
			.notNull(),
		replyTo: jsonb("reply_to")
			.$type<Array<{ name?: string; email: string }>>()
			.default(sql`'[]'::jsonb`),
		deliveredTo: text("delivered_to"),
		// priority: text("priority"),
		priority: MessagePriorityEnum("priority").default(sql`null`),
		html: text("html"),

		subject: text("subject"),
		snippet: text("snippet"),
		// fromName: text("from_name"),
		// fromEmail: text("from_email"),

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
		// index("idx_messages_thread_date").on(t.threadId, t.date),
		index("idx_messages_in_reply_to").on(t.inReplyTo),

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

// threads.ts
export const threads = pgTable(
	"threads",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(sql`auth.uid()`),

		mailboxId: uuid("mailbox_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.notNull(),

		lastMessageDate: timestamp("last_message_date", { withTimezone: true }), // nullable until first msg written
		lastMessageId: uuid("last_message_id")
			.references(() => messages.id, { onDelete: "set null" })
			.default(null),

		// start at 0; bump in same tx when inserting first message
		messageCount: integer("message_count").notNull().default(0),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		// sorting & pagination helper (DESC not expressible in Drizzle index; include id for tie-break)
		index("idx_threads_mailbox_lastdate").on(
			t.mailboxId,
			t.lastMessageDate,
			t.id,
		),
		index("idx_threads_mailbox_updated").on(t.mailboxId, t.updatedAt),

		// RLS
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
