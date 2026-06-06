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
	pgSchema
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
    AddressObjectJSON,
    apiScopeList,
    calendarAttendeePartstatList,
    calendarAttendeeRoleList,
    calendarBusyStatusList,
    calendarEventStatusList,
    draftMessageStates,
    driveEntryTypes,
    driveUploadIntentTypes,
    driveVolumesList,
    identityStatusList,
    identityTypesList,
    labelScopesList,
    mailboxKindsList,
    mailboxSyncPhase, MailRuleMatchV1,
    mailRulesActionsList, mailSubscriptionStatusList,
    messagePriorityList,
    messageStatesList,
    providersList,
    webHookList,
} from "@schema";
import { DnsRecord } from "@providers";
import { nanoid } from "nanoid";
import {
	identitySelectCondition,
	identitySelectConditionForIdentities,
	workspaceCrudPolicies,
	workspaceMutationPolicies,
	workspaceTablePolicies
} from "./helpers";

export const authUid = sql`
  nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
`;

export const authWorkspaceId = sql`
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
`;

export const DavAccountTypeEnum = pgEnum("dav_account_type", ["user", "workspace"]);
export const WorkspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "member"]);
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
export const LabelScopeEnum = pgEnum("label_scope", labelScopesList);

export const CalendarEventStatusEnum = pgEnum(
	"calendar_event_status",
	calendarEventStatusList,
);
export const CalendarBusyStatusEnum = pgEnum(
	"calendar_busy_status",
	calendarBusyStatusList,
);
export const CalendarAttendeeRoleEnum = pgEnum(
	"calendar_attendee_role",
	calendarAttendeeRoleList,
);
export const CalendarAttendeePartstatEnum = pgEnum(
	"calendar_attendee_partstat",
	calendarAttendeePartstatList,
);

export const DriveVolumeKindEnum = pgEnum(
	"drive_volume_kind",
	driveVolumesList,
);
export const DriveEntryTypeEnum = pgEnum("drive_entry_type", driveEntryTypes);
export const DriveUploadIntentScopeEnum = pgEnum(
	"drive_upload_intent_scope",
	driveUploadIntentTypes,
);
export const DraftMessageStatusEnum = pgEnum(
	"draft_message_status",
	draftMessageStates,
);

export const MailSubscriptionStatusEnum = pgEnum("mail_subscription_status", mailSubscriptionStatusList);
export const MailRuleActionTypeEnum = pgEnum("mail_rule_action_type", mailRulesActionsList);




export const workspaces = pgTable(
	"workspaces",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		name: text("name").notNull(),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(sql`null`),

		defaultIdentityId: uuid("default_identity_id")
			.references(() => identities.id, { onDelete: "set null" })
			.default(sql`null`),

		storageBytesUsed: bigint("storage_bytes_used", { mode: "number" }).notNull().default(0),
		isStorageOverLimit: boolean("is_storage_over_limit")
			.notNull()
			.default(false),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_workspace_public_id").on(t.publicId),
		index("idx_workspace_owner").on(t.ownerId),
		index("ix_workspaces_default_identity").on(t.defaultIdentityId),

		...workspaceTablePolicies(t)
	],
).enableRLS();

export const workspaceMembers = pgTable(
	"workspace_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id, { onDelete: "cascade" })
			.notNull(),

		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),

		role: WorkspaceRoleEnum("role").notNull().default("member"),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(sql`null`),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => [
		uniqueIndex("uniq_workspace_member").on(t.workspaceId, t.userId),
		index("idx_workspace_members_workspace").on(t.workspaceId),
		index("idx_workspace_members_user").on(t.userId),
		...workspaceCrudPolicies(t, "workspace_members"),
	],
).enableRLS();


export const authSchema = pgSchema('auth');

export const users = authSchema.table(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		email: text("email").notNull(),
		passwordHash: text("password_hash").notNull(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => {

		return [
			uniqueIndex("ux_users_email").on(t.email),
			pgPolicy("users_select_self", {
				for: "select",
				to: "kurrier",
				using: sql`${t.id} = ${authUid}`,
			}),
			pgPolicy("users_update_self", {
				for: "update",
				to: "kurrier",
				using: sql`${t.id} = ${authUid}`,
				withCheck: sql`${t.id} = ${authUid}`,
			}),
		]
	},
).enableRLS();


export const workspaceIdentityMembers = pgTable(
	"workspace_identity_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "cascade" })
			.notNull(),

		userId: uuid("user_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		metaData: jsonb("meta")
			.$type<Record<string, any> | null>()
			.default(sql`null`),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_identity_member_unique").on(
			t.workspaceId,
			t.identityId,
			t.userId,
		),

		index("ix_identity_members_workspace").on(t.workspaceId),
		index("ix_identity_members_identity").on(t.identityId),
		index("ix_identity_members_user").on(t.userId),

		index("ix_wim_user_identity").on(t.userId, t.identityId),

		pgPolicy("workspace_identity_members_select", {
			for: "select",
			to: "kurrier",
			using: sql`
            ${t.workspaceId} = ${authWorkspaceId}
            AND ${t.userId} = ${authUid}
          `,
		}),
		...workspaceMutationPolicies(t, "workspace_identity_members"),

	],
).enableRLS();




export const secretsMeta = pgTable(
	"secrets_meta",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		name: text("name").notNull(),
		description: text("description"),
		// vaultSecret: uuid("vault_secret").notNull(),

		encryptedValue: text("encrypted_value").notNull(),
		iv: text("iv").notNull(),
		authTag: text("auth_tag").notNull(),

		keyVersion: integer("key_version").notNull().default(1),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
	},
	(t) => [
		index("ix_secrets_meta_workspace").on(t.workspaceId),
		index("ix_secrets_meta_owner").on(t.ownerId),
		uniqueIndex("ux_secrets_meta_workspace_name").on(
			t.workspaceId,
			t.name
		),
		...workspaceCrudPolicies(t, "secrets_meta"),
	],
).enableRLS();

export const providers = pgTable(
	"providers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		type: ProviderKindEnum("type").notNull(),
		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_providers_workspace").on(t.workspaceId),
		uniqueIndex("ux_providers_owner_type_workspace").on(t.ownerId, t.type, t.workspaceId),
		...workspaceCrudPolicies(t, "providers"),
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
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_provider_secret").on(t.providerId, t.secretId),
		index("ix_provider_secret_provider").on(t.providerId),
		index("ix_provider_secret_secret").on(t.secretId),
		index("ix_provider_secret_secret_provider").on(t.secretId, t.providerId),
		...workspaceCrudPolicies(t, "provider_secrets"),
	],
).enableRLS();

export const smtpAccounts = pgTable(
	"smtp_accounts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_smtp_accounts_workspace").on(t.workspaceId),
		...workspaceCrudPolicies(t, "smtp_accounts"),
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
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_smtp_account_secret").on(t.accountId, t.secretId),
		index("ix_smtp_account_secret_secret").on(t.secretId),
		...workspaceCrudPolicies(t, "smtp_account_secrets"),
	],
).enableRLS();

export const identities = pgTable(
	"identities",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		kind: IdentityKindEnum("kind").notNull(),
		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		value: text("value").notNull(), // domain or email address
		displayName: text("display_name"),
		incomingDomain: boolean("incoming_domain").default(false),

		sharedWithWorkspace: boolean("shared_with_workspace").notNull().default(false),

		domainIdentityId: uuid("domain_identity_id")
			.references(() => identities.id, { onDelete: "set null" })
			.default(null),

		dnsRecords: jsonb("dns_records").$type<DnsRecord[] | null>().default(null),
		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),
		providerId: uuid("provider_id").references(() => providers.id), // SES/SendGrid/Mailgun/Postmark
		smtpAccountId: uuid("smtp_account_id").references(() => smtpAccounts.id), // Custom SMTP

		status: IdentityStatusEnum("status").notNull().default("unverified"),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_identities_workspace").on(t.workspaceId),
		uniqueIndex("uniq_identity_per_workspace").on(t.workspaceId, t.kind, t.value),
		uniqueIndex("uniq_identity_public_id").on(t.publicId),
		index("ix_identities_domain_identity").on(t.domainIdentityId),
		index("ix_identities_provider").on(t.providerId),
		index("ix_identities_smtp_account").on(t.smtpAccountId),
		pgPolicy("identities_select", {
			for: "select",
			to: "kurrier",
			using: identitySelectConditionForIdentities(t),
		}),
		...workspaceMutationPolicies(t, "identities"),
	],
).enableRLS();

export const mailboxes = pgTable(
	"mailboxes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
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
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_mailboxes_workspace").on(t.workspaceId),
		uniqueIndex("uniq_mailbox_public_id").on(t.publicId),
		uniqueIndex("uniq_default_mailbox_per_kind")
			.on(t.identityId, t.kind)
			.where(sql`${t.isDefault} IS TRUE`),
		uniqueIndex("uniq_mailbox_slug_per_identity")
			.on(t.identityId, t.slug)
			.where(sql`${t.slug} IS NOT NULL`),

		index("idx_mailbox_parent").on(t.parentId),
		...workspaceCrudPolicies(t, "mailboxes"),
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
			.default(authUid),

		messageId: uuid("message_id")
			.references(() => messages.id, { onDelete: "cascade" })
			.notNull(),

		bucketId: text("bucket_id").notNull().default(process.env.S3_BUCKET || "kurrier-store"),
		path: text("path").notNull(), // e.g. "private/<userId>/<messageId>/<uuid>.<ext>"

		filenameOriginal: text("filename_original"),
		contentType: text("content_type"),
		sizeBytes: integer("size_bytes"),

		cid: text("cid"),
		isInline: boolean("is_inline").notNull().default(false),
		checksum: text("checksum"),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_message_attachments_workspace").on(t.workspaceId),
		index("idx_msg_attachments_message").on(t.messageId),
		uniqueIndex("uniq_bucket_path").on(t.bucketId, t.path),
		index("idx_msg_attachments_cid").on(t.cid),
		...workspaceCrudPolicies(t, "message_attachments"),
	],
).enableRLS();

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
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

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

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
		index("ix_messages_workspace").on(t.workspaceId),


		uniqueIndex("uniq_mailbox_message_id").on(t.mailboxId, t.messageId),
		index("idx_messages_in_reply_to").on(t.inReplyTo),

		index("ix_messages_thread_flagged").on(t.threadId, t.flagged),

		index("idx_messages_mailbox_date").on(t.mailboxId, t.date),
		index("idx_messages_mailbox_seen_date").on(t.mailboxId, t.seen, t.date),
		index("ix_messages_thread").on(t.threadId),
		...workspaceCrudPolicies(t, "messages"),
	],
).enableRLS();

export const threads = pgTable(
	"threads",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		lastMessageDate: timestamp("last_message_date", { withTimezone: true }), // nullable until first msg written
		lastMessageId: uuid("last_message_id")
			.references(() => messages.id, { onDelete: "set null" })
			.default(null),

		messageCount: integer("message_count").notNull().default(0),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_threads_workspace").on(t.workspaceId),
		...workspaceCrudPolicies(t, "threads"),
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
			.default(authUid),

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

		snoozedUntil: timestamp("snoozed_until", { withTimezone: true }).default(
			null,
		),
		unsnoozedAt: timestamp("unsnoozed_at", { withTimezone: true }).default(
			null,
		),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},

	(t) => [
		index("ix_mailbox_threads_workspace").on(t.workspaceId),
		index("ix_mailbox_threads_identity").on(t.identityId),
		primaryKey({
			name: "pk_mailbox_threads",
			columns: [t.threadId, t.mailboxId],
		}),

		index("ix_mbth_mailbox_activity").on(
			t.mailboxId,
			t.lastActivityAt,
			t.threadId,
		),

		index("ix_mbth_identity_slug_effective_activity").on(
			t.identityPublicId,
			t.mailboxSlug,
			sql`COALESCE(${t.unsnoozedAt}, ${t.lastActivityAt})`,
			t.lastActivityAt,
			t.threadId,
		),

		index("ix_mbth_identity_slug").on(t.identityId, t.mailboxSlug),
		index("ix_mbth_identity_public_id").on(t.identityPublicId),

		index("ix_mbth_mailbox_unread").on(t.mailboxId, t.unreadCount),
		index("ix_mbth_mailbox_starred").on(t.mailboxId, t.starred),

		index("ix_mbth_mailbox_snoozed_until").on(t.mailboxId, t.snoozedUntil),
		index("ix_mbth_mailbox_unsnoozed_at").on(t.mailboxId, t.unsnoozedAt),
		pgPolicy("mailbox_threads_select", {
			for: "select",
			to: "kurrier",
			using: identitySelectCondition(t, t.identityId),
		}),
		...workspaceMutationPolicies(t, "mailbox_threads"),
	],
).enableRLS();

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

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

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => sql`now()`),
	},
	(t) => [
		index("ix_api_keys_workspace").on(t.workspaceId),
		uniqueIndex("ux_api_keys_workspace_name").on(t.workspaceId, t.name),
		uniqueIndex("ux_api_keys_workspace_prefix").on(t.workspaceId, t.keyPrefix),
		index("ix_api_keys_workspace_owner").on(t.workspaceId, t.ownerId),
		index("ix_api_keys_expires").on(t.expiresAt),
		index("ix_api_keys_revoked").on(t.revokedAt),
		...workspaceCrudPolicies(t, "api_keys"),
	],
).enableRLS();

export const webhooks = pgTable(
	"webhooks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "set null" })
			.default(null),

		url: text("url").notNull(),
		description: text("description"),

		events: WebHookEnum("events").array().notNull(),

		enabled: boolean("enabled").notNull().default(true),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_webhooks_workspace").on(t.workspaceId),
		index("ix_webhooks_identity").on(t.identityId),
		index("ix_webhooks_enabled").on(t.workspaceId, t.enabled),
		...workspaceCrudPolicies(t, "webhooks"),
	],
).enableRLS();

export const labels = pgTable(
	"labels",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		name: text("name").notNull(),
		slug: text("slug").notNull(),

		parentId: uuid("parent_id")
			.references(() => labels.id, { onDelete: "cascade" })
			.default(null),

		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "cascade" })
			.default(null),

		colorBg: text("color_bg"),
		colorText: text("color_text"),

		isSystem: boolean("is_system").notNull().default(false),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		scope: LabelScopeEnum("scope").notNull().default("thread"),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("uniq_label_workspace_scope_slug").on(t.workspaceId, t.scope, t.slug),
		index("ix_labels_identity").on(t.identityId),
		index("ix_labels_workspace_identity").on(t.workspaceId, t.identityId),
		pgPolicy("labels_select", {
			for: "select",
			to: "kurrier",
			using: sql`
				${t.workspaceId} = ${authWorkspaceId}
				AND (
				${t.identityId} IS NULL
				OR ${identitySelectCondition(t, t.identityId)}
				)
			`,
		}),
		...workspaceMutationPolicies(t, "labels")
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
			.default(authUid),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

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
		...workspaceCrudPolicies(t, "mailbox_thread_labels"),
	],
).enableRLS();

export const contacts = pgTable(
	"contacts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),
		profilePicture: text("profile_picture"),
		profilePictureXs: text("profile_picture_xs"),
		firstName: text("first_name").notNull(),
		lastName: text("last_name"),
		company: text("company"),
		jobTitle: text("job_title"),
		department: text("department"),
		emails: jsonb("emails")
			.$type<{ address: string }[]>()
			.notNull()
			.default([]),
		phones: jsonb("phones")
			.$type<{ code: string | null; number: string }[]>()
			.notNull()
			.default([]),
		addresses: jsonb("addresses")
			.$type<
				{
					country: string | null;
					streetAddress: string | null;
					streetAddressLine2: string | null;
					city: string | null;
					state: string | null;
					code: string | null;
				}[]
			>()
			.notNull()
			.default([]),
		dob: text("dob"),
		notes: text("notes"),

		davEtag: text("dav_etag"),
		davUri: text("dav_uri"),

		addressBookId: uuid("address_book_id")
			.references(() => addressBooks.id, { onDelete: "cascade" })
			.notNull(),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_contacts_workspace_public_id").on(t.workspaceId, t.publicId),
		index("ix_contacts_workspace").on(t.workspaceId),
		index("ix_contacts_workspace_name").on(t.workspaceId, t.lastName, t.firstName),
		index("ix_contacts_address_book").on(t.addressBookId),
		pgPolicy("contacts_select", {
			for: "select",
			to: "kurrier",
			using: sql`
				${t.workspaceId} = ${authWorkspaceId}
				AND EXISTS (
				SELECT 1
				FROM address_books ab
				WHERE
				ab.id = ${t.addressBookId}
				AND ab.workspace_id = ${authWorkspaceId}
				AND ab.owner_id = ${authUid}
				)
			`
		}),
		...workspaceMutationPolicies(t, "contacts"),
	],
).enableRLS();

export const contactLabels = pgTable(
	"contact_labels",
	{
		contactId: uuid("contact_id")
			.references(() => contacts.id, { onDelete: "cascade" })
			.notNull(),

		labelId: uuid("label_id")
			.references(() => labels.id, { onDelete: "cascade" })
			.notNull(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		primaryKey({
			name: "pk_contact_labels",
			columns: [t.contactId, t.labelId],
		}),
		index("ix_contact_labels_label").on(t.labelId),
		pgPolicy("contact_labels_select", {
			for: "select",
			to: "kurrier",
			using: sql`
				${t.workspaceId} = ${authWorkspaceId}
				AND EXISTS (
				SELECT 1
				FROM contacts c
				WHERE c.id = ${t.contactId}
				)
			`,
		}),
		...workspaceMutationPolicies(t, "contact_labels"),
	],
).enableRLS();

export const appMigrations = pgTable(
	"app_migrations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		version: text("version").notNull(),
		scope: text("scope").notNull().default("default"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_app_migrations_scope_version").on(t.scope, t.version),
	],
)

export const davAccounts = pgTable(
	"dav_accounts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		type: DavAccountTypeEnum("type")
			.notNull()
			.default("user"),
		username: text("username").notNull(),
		secretId: uuid("secret_id")
			.references(() => secretsMeta.id, { onDelete: "cascade" })
			.notNull(),
		basePath: text("base_path").notNull().default("/"),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_dav_workspace_account")
			.on(t.workspaceId)
			.where(sql`${t.type} = 'workspace'`),
		uniqueIndex("ux_dav_username").on(t.username),
		pgPolicy("dav_accounts_select", {
			for: "select",
			to: "kurrier",
			using: sql`
				${t.workspaceId} = ${authWorkspaceId}
				AND (
				(
				${t.type} = 'user'
				AND ${t.ownerId} = ${authUid}
				)
				OR ${t.type} = 'workspace'
				)
			`,
		}),
		...workspaceMutationPolicies(t, "dav_accounts"),
	],
).enableRLS();

export const addressBooks = pgTable(
	"address_books",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		davAccountId: uuid("dav_account_id")
			.references(() => davAccounts.id, { onDelete: "cascade" })
			.notNull(),
		davSyncToken: text("dav_sync_token"),
		davAddressBookId: integer("dav_address_book_id"),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_address_books_dav_id").on(t.davAddressBookId),
		uniqueIndex("ux_address_books_workspace_owner").on(t.workspaceId, t.ownerId),
		index("ix_address_books_owner").on(t.ownerId),
		index("ix_address_books_dav_account").on(t.davAccountId),
		pgPolicy("address_books_select", {
			for: "select",
			to: "kurrier",
			using: sql`${t.ownerId} = ${authUid} AND ${t.workspaceId} = ${authWorkspaceId}`,
		}),
		...workspaceMutationPolicies(t, "address_books"),
	],
).enableRLS();

// Calendar Tables

export const calendars = pgTable(
	"calendars",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		davAccountId: uuid("dav_account_id")
			.references(() => davAccounts.id, { onDelete: "cascade" })
			.notNull(),
		davSyncToken: text("dav_sync_token"),
		davCalendarId: integer("dav_calendar_id"),

		identityId: uuid("identity_id").references(() => identities.id, { onDelete: "cascade" }).default(null),

		name: text("name").notNull(),
		slug: text("slug").notNull(),
		color: text("color"),
		timezone: text("timezone").notNull().default("UTC"),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_calendars_workspace_slug").on(t.workspaceId, t.slug),
		uniqueIndex("ux_calendar_workspace_identity").on(t.workspaceId, t.identityId),
		index("ix_calendars_owner").on(t.ownerId),
		index("ix_calendars_dav_account").on(t.davAccountId),
		index("ix_calendars_identity").on(t.identityId),
		index("ix_calendars_workspace_identity").on(t.workspaceId, t.identityId),
		pgPolicy("calendars_select", {
			for: "select",
			to: "kurrier",
			using: identitySelectCondition(t, t.identityId),
		}),
		...workspaceMutationPolicies(t, "calendars"),
	],
).enableRLS();

export const calendarEvents = pgTable(
	"calendar_events",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		calendarId: uuid("calendar_id")
			.references(() => calendars.id, { onDelete: "cascade" })
			.notNull(),

		organizerIdentityId: uuid("organizer_identity_id").references(
			() => identities.id,
			{ onDelete: "set null" },
		),
		organizerEmail: text("organizer_email"),
		organizerName: text("organizer_name"),

		title: text("title").notNull(),
		description: text("description"),
		location: text("location"),

		isAllDay: boolean("is_all_day").notNull().default(false),

		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),

		status: CalendarEventStatusEnum("status").notNull().default("confirmed"),

		busyStatus: CalendarBusyStatusEnum("busy_status").notNull().default("busy"),

		davEtag: text("dav_etag"),
		davUri: text("dav_uri"),

		rawIcs: text("raw_ics"),
		icalUid: text("ical_uid"),

		isExternal: boolean("is_external").notNull().default(false),

		recurrenceRule: text("recurrence_rule"),
		recurrenceExdates: timestamp("recurrence_exdates", { withTimezone: true })
			.array()
			.notNull()
			.default(sql`'{}'::timestamptz[]`),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_calendar_events_owner").on(t.ownerId),
		index("ix_calendar_events_calendar").on(t.calendarId),
		index("ix_calendar_events_calendar_start").on(t.calendarId, t.startsAt),
		index("ix_calendar_events_calendar_dav_uri").on(t.calendarId, t.davUri),
		index("ix_calendar_events_organizer_identity").on(t.organizerIdentityId),
		uniqueIndex("ux_calendar_events_calendar_ical_uid")
			.on(t.calendarId, t.icalUid)
			.where(sql`${t.icalUid} IS NOT NULL`),
		...workspaceCrudPolicies(t, "calendar_events"),
	],
).enableRLS();

export const calendarEventAttendees = pgTable(
	"calendar_event_attendees",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		eventId: uuid("event_id")
			.references(() => calendarEvents.id, { onDelete: "cascade" })
			.notNull(),

		email: text("email").notNull(),
		name: text("name"),

		role: CalendarAttendeeRoleEnum("role").notNull().default("req_participant"),
		partstat: CalendarAttendeePartstatEnum("partstat")
			.notNull()
			.default("needs_action"),

		rsvp: boolean("rsvp").notNull().default(false),

		isOrganizer: boolean("is_organizer").notNull().default(false),
		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_event_attendees_owner").on(t.ownerId),
		index("ix_event_attendees_event").on(t.eventId),
		index("ix_event_attendees_email").on(t.email),
		uniqueIndex("ux_event_attendees_event_email").on(t.eventId, t.email),
		...workspaceCrudPolicies(t, "calendar_event_attendees"),
	],
).enableRLS();

export const driveVolumes = pgTable(
	"drive_volumes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		publicId: text("public_id")
			.notNull()
			.$defaultFn(() => nanoid(10)),

		kind: DriveVolumeKindEnum("kind").notNull().default("local"),

		code: text("code").notNull(),
		label: text("label").notNull(),

		basePath: text("base_path"),

		providerId: uuid("provider_id").references(() => providers.id, {
			onDelete: "set null",
		}),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_drive_volumes_workspace_code").on(t.workspaceId, t.code),
		uniqueIndex("ux_drive_volumes_public_id").on(t.publicId),
		index("ix_drive_volumes_owner").on(t.ownerId),
		index("ix_drive_volumes_provider").on(t.providerId),
		...workspaceCrudPolicies(t, "drive_volumes"),
	],
).enableRLS();

export const driveEntries = pgTable(
	"drive_entries",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		volumeId: uuid("volume_id")
			.references(() => driveVolumes.id, { onDelete: "cascade" })
			.notNull(),

		type: DriveEntryTypeEnum("type").notNull().default("file"),

		path: text("path").notNull(),
		name: text("name").notNull(),

		sizeBytes: bigint("size_bytes", { mode: "number" }).default(0),
		mimeType: text("mime_type"),

		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),

		metaData: jsonb("meta").$type<Record<string, any> | null>().default(null),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_drive_entries_owner_volume_path").on(
			t.ownerId,
			t.volumeId,
			t.path,
		),
		index("ix_drive_entries_owner").on(t.ownerId),
		index("ix_drive_entries_volume").on(t.volumeId),
		...workspaceCrudPolicies(t, "drive_entries"),
	],
).enableRLS();

export const driveUploadIntents = pgTable(
	"drive_upload_intents",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		volumeId: uuid("volume_id")
			.references(() => driveVolumes.id, { onDelete: "cascade" })
			.notNull(),
		scope: DriveUploadIntentScopeEnum("scope").notNull().default("home"),
		token: text("token").notNull(),
		targetPath: text("target_path").notNull(),
		singleUse: boolean("single_use").notNull().default(true),
		usedAt: timestamp("used_at", { withTimezone: true }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("ux_drive_upload_intents_token").on(t.token),
		index("ix_drive_upload_intents_owner").on(t.ownerId),
		index("ix_drive_upload_intents_volume").on(t.volumeId),
		index("ix_drive_upload_intents_expires").on(t.expiresAt),
		...workspaceCrudPolicies(t, "drive_upload_intents"),
	],
).enableRLS();

export const draftMessages = pgTable(
	"draft_messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),
		mailboxId: uuid("mailbox_id")
			.references(() => mailboxes.id, { onDelete: "cascade" })
			.notNull(),
		identityId: uuid("identity_id")
			.references(() => identities.id, { onDelete: "cascade" })
			.default(null),
		status: DraftMessageStatusEnum("status").notNull().default("draft"),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true }).default(
			null,
		),
		payload: jsonb("payload").$type<Record<string, any>>().notNull(),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_draft_messages_owner").on(t.ownerId),
		index("ix_draft_messages_mailbox").on(t.mailboxId),
		index("ix_draft_messages_identity").on(t.identityId),
		index("ix_draft_messages_status").on(t.status),
		index("ix_draft_messages_scheduled_at").on(t.scheduledAt),
		index("ix_draft_messages_updated_at").on(t.updatedAt),
		...workspaceCrudPolicies(t, "draft_messages"),
	],
).enableRLS();


export const mailSubscriptions = pgTable(
    "mail_subscriptions",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        ownerId: uuid("owner_id")
            .references(() => users.id)
            .notNull()
            .default(authUid),

        subscriptionKey: text("subscription_key").notNull(),

        listId: text("list_id"),
        unsubscribeHttpUrl: text("unsubscribe_http_url"),
        unsubscribeMailto: text("unsubscribe_mailto"),
        oneClick: boolean("one_click").notNull().default(false),

        status: MailSubscriptionStatusEnum("status")
            .notNull()
            .default("subscribed"),

        lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
        unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
		uniqueIndex("uniq_mail_subscriptions_workspace_key").on(t.workspaceId, t.subscriptionKey),
		index("idx_mail_subscriptions_status").on(t.ownerId, t.status),
		index("idx_mail_subscriptions_last_seen").on(t.ownerId, t.lastSeenAt),
		...workspaceCrudPolicies(t, "mail_subscriptions"),
    ],
).enableRLS();




export const mailRules = pgTable(
    "mail_rules",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        ownerId: uuid("owner_id")
            .references(() => users.id)
            .notNull()
            .default(authUid),

        identityId: uuid("identity_id")
            .references(() => identities.id, { onDelete: "cascade" })
            .notNull(),

        name: text("name").notNull(),
        enabled: boolean("enabled").notNull().default(true),

        priority: integer("priority").notNull().default(100),
        stopProcessing: boolean("stop_processing").notNull().default(false),

        match: jsonb("match").$type<MailRuleMatchV1>().notNull(),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
		index("idx_mail_rules_owner_identity").on(t.ownerId, t.identityId),
		index("ix_mail_rules_identity").on(t.identityId),
		index("idx_mail_rules_owner_enabled_priority").on(
			t.ownerId,
			t.enabled,
			t.priority,
		),
		...workspaceCrudPolicies(t, "mail_rules"),
    ],
).enableRLS();

export const mailRuleActions = pgTable(
    "mail_rule_actions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        ownerId: uuid("owner_id")
            .references(() => users.id)
            .notNull()
            .default(authUid),
        ruleId: uuid("rule_id")
            .references(() => mailRules.id, { onDelete: "cascade" })
            .notNull(),
        actionType: MailRuleActionTypeEnum("action_type").notNull(),
        order: integer("order").notNull().default(0),
        params: jsonb("params")
            .$type<{ labelId?: string; mailboxId?: string } | null>()
            .default(sql`null`),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
		uniqueIndex("uniq_mail_rule_actions_rule_order").on(t.ruleId, t.order),
		index("idx_mail_rule_actions_rule").on(t.ruleId),
		...workspaceCrudPolicies(t, "mail_rule_actions"),
    ],
).enableRLS();

export const authProviders = pgTable(
	"auth_providers",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		ownerId: uuid("owner_id")
			.references(() => users.id)
			.notNull()
			.default(authUid),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		type: text("type").notNull().default("oidc"),

		name: text("name").notNull(),

		issuerUrl: text("issuer_url").notNull(),
		clientId: text("client_id").notNull(),

		clientSecretId: uuid("client_secret_id")
			.references(() => secretsMeta.id, { onDelete: "set null" }),

		scopes: text("scopes").notNull().default("openid email profile"),

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
		index("ix_auth_providers_workspace").on(t.workspaceId),
		uniqueIndex("ux_auth_provider_workspace_name").on(t.workspaceId, t.name),
		...workspaceCrudPolicies(t, "auth_providers"),
	],
).enableRLS();

export const authAccounts = pgTable(
	"auth_accounts",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),

		providerId: uuid("provider_id")
			.references(() => authProviders.id, { onDelete: "cascade" })
			.notNull(),

		providerUserId: text("provider_user_id").notNull(),

		email: text("email").notNull(),

		emailVerified: boolean("email_verified").notNull().default(false),

		rawProfile: jsonb("raw_profile").$type<Record<string, any> | null>().default(null),

		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id)
			.notNull()
			.default(authWorkspaceId),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("ix_auth_accounts_workspace").on(t.workspaceId),
		index("ix_auth_accounts_user").on(t.userId),
		index("ix_auth_accounts_provider").on(t.providerId),

		uniqueIndex("ux_auth_account_provider_subject").on(
			t.providerId,
			t.providerUserId,
		),

		uniqueIndex("ux_auth_account_workspace_email_provider").on(
			t.workspaceId,
			t.email,
			t.providerId,
		),

		...workspaceCrudPolicies(t, "auth_accounts"),
	],
).enableRLS();
