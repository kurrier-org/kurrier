CREATE TYPE "public"."identity_kind" AS ENUM('domain', 'email');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('unverified', 'pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."mailbox_kind" AS ENUM('inbox', 'sent', 'drafts', 'archive', 'spam', 'trash', 'outbox', 'custom');--> statement-breakpoint
CREATE TYPE "public"."message_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."message_state" AS ENUM('normal', 'bounced', 'queued', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('smtp', 'ses', 'mailgun', 'postmark', 'sendgrid');--> statement-breakpoint
CREATE TYPE "public"."mailbox_sync_phase" AS ENUM('BOOTSTRAP', 'BACKFILL', 'IDLE');--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"kind" "identity_kind" NOT NULL,
	"public_id" text NOT NULL,
	"value" text NOT NULL,
	"incoming_domain" boolean DEFAULT false,
	"domain_identity_id" uuid DEFAULT null,
	"dns_records" jsonb DEFAULT 'null'::jsonb,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"provider_id" uuid,
	"smtp_account_id" uuid,
	"status" "identity_status" DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mailbox_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"uid_validity" bigint NOT NULL,
	"last_seen_uid" bigint DEFAULT 0 NOT NULL,
	"backfill_cursor_uid" bigint DEFAULT 0 NOT NULL,
	"highest_modseq" numeric(20, 0),
	"phase" "mailbox_sync_phase" DEFAULT 'BOOTSTRAP' NOT NULL,
	"synced_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mailbox_threads" (
	"thread_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"identity_public_id" text NOT NULL,
	"mailbox_slug" text,
	"subject" text,
	"preview_text" text,
	"last_activity_at" timestamp with time zone NOT NULL,
	"first_message_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"participants" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_mailbox_threads" PRIMARY KEY("thread_id","mailbox_id")
);
--> statement-breakpoint
ALTER TABLE "mailbox_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"kind" "mailbox_kind" DEFAULT 'inbox' NOT NULL,
	"name" text,
	"slug" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailboxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"message_id" uuid NOT NULL,
	"bucket_id" text DEFAULT 'attachments' NOT NULL,
	"path" text NOT NULL,
	"filename_original" text,
	"content_type" text,
	"size_bytes" integer,
	"cid" text,
	"is_inline" boolean DEFAULT false NOT NULL,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"message_id" text NOT NULL,
	"in_reply_to" text,
	"references" text[],
	"thread_id" uuid NOT NULL,
	"reply_to" jsonb DEFAULT '[]'::jsonb,
	"delivered_to" text,
	"priority" "message_priority" DEFAULT null,
	"html" text,
	"subject" text,
	"snippet" text,
	"text" text,
	"text_as_html" text,
	"from" jsonb DEFAULT null,
	"to" jsonb DEFAULT null,
	"cc" jsonb DEFAULT null,
	"bcc" jsonb DEFAULT null,
	"date" timestamp with time zone,
	"size_bytes" integer,
	"seen" boolean DEFAULT false NOT NULL,
	"answered" boolean DEFAULT false NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"state" "message_state" DEFAULT 'normal' NOT NULL,
	"headers_json" jsonb DEFAULT 'null'::jsonb,
	"raw_storage_key" text,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"secret_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"type" "provider_kind" NOT NULL,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "secrets_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"vault_secret" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "secrets_meta" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "smtp_account_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"secret_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "smtp_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smtp_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"last_message_date" timestamp with time zone,
	"last_message_id" uuid DEFAULT null,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_domain_identity_id_identities_id_fk" FOREIGN KEY ("domain_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_smtp_account_id_smtp_accounts_id_fk" FOREIGN KEY ("smtp_account_id") REFERENCES "public"."smtp_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_sync" ADD CONSTRAINT "mailbox_sync_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_sync" ADD CONSTRAINT "mailbox_sync_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_secrets" ADD CONSTRAINT "provider_secrets_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_secrets" ADD CONSTRAINT "provider_secrets_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets_meta" ADD CONSTRAINT "secrets_meta_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ADD CONSTRAINT "smtp_account_secrets_account_id_smtp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."smtp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ADD CONSTRAINT "smtp_account_secrets_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_accounts" ADD CONSTRAINT "smtp_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_last_message_id_messages_id_fk" FOREIGN KEY ("last_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identity_per_user" ON "identities" USING btree ("owner_id","kind","value");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identity_public_id" ON "identities" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_mailbox_sync_mailbox" ON "mailbox_sync" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "ix_mailbox_sync_identity" ON "mailbox_sync" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_mailbox_sync_phase" ON "mailbox_sync" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_activity" ON "mailbox_threads" USING btree ("mailbox_id","last_activity_at","thread_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_slug" ON "mailbox_threads" USING btree ("identity_id","mailbox_slug");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_public_id" ON "mailbox_threads" USING btree ("identity_public_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_unread" ON "mailbox_threads" USING btree ("mailbox_id","unread_count");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_starred" ON "mailbox_threads" USING btree ("mailbox_id","starred");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_mbth_thread_mailbox" ON "mailbox_threads" USING btree ("thread_id","mailbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mailbox_public_id" ON "mailboxes" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_default_mailbox_per_kind" ON "mailboxes" USING btree ("identity_id","kind") WHERE "mailboxes"."is_default" IS TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mailbox_slug_per_identity" ON "mailboxes" USING btree ("identity_id","slug") WHERE "mailboxes"."slug" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_msg_attachments_message" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_bucket_path" ON "message_attachments" USING btree ("bucket_id","path");--> statement-breakpoint
CREATE INDEX "idx_msg_attachments_cid" ON "message_attachments" USING btree ("cid");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_message_public_id" ON "messages" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "idx_messages_priority" ON "messages" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mailbox_message_id" ON "messages" USING btree ("mailbox_id","message_id");--> statement-breakpoint
CREATE INDEX "idx_messages_in_reply_to" ON "messages" USING btree ("in_reply_to");--> statement-breakpoint
CREATE INDEX "ix_messages_thread_flagged" ON "messages" USING btree ("thread_id","flagged");--> statement-breakpoint
CREATE INDEX "idx_messages_mailbox_date" ON "messages" USING btree ("mailbox_id","date");--> statement-breakpoint
CREATE INDEX "idx_messages_mailbox_seen_date" ON "messages" USING btree ("mailbox_id","seen","date");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_provider_per_user" ON "providers" USING btree ("owner_id","type");--> statement-breakpoint
CREATE INDEX "idx_threads_owner_lastdate" ON "threads" USING btree ("owner_id","last_message_date","id");--> statement-breakpoint
CREATE INDEX "idx_threads_owner_id" ON "threads" USING btree ("owner_id","id");--> statement-breakpoint
CREATE POLICY "identities_select_own" ON "identities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("identities"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "identities_insert_own" ON "identities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("identities"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "identities_update_own" ON "identities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("identities"."owner_id" = (select auth.uid())) WITH CHECK ("identities"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "identities_delete_own" ON "identities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("identities"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_select_own" ON "mailbox_threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_insert_own" ON "mailbox_threads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_update_own" ON "mailbox_threads" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mailbox_threads"."owner_id" = (select auth.uid())) WITH CHECK ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_delete_own" ON "mailbox_threads" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mailboxes_select_own" ON "mailboxes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mailboxes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mailboxes_insert_own" ON "mailboxes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mailboxes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mailboxes_update_own" ON "mailboxes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mailboxes"."owner_id" = (select auth.uid())) WITH CHECK ("mailboxes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mailboxes_delete_own" ON "mailboxes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mailboxes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "message_attachments_select_own" ON "message_attachments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("message_attachments"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "message_attachments_insert_own" ON "message_attachments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("message_attachments"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "message_attachments_update_own" ON "message_attachments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("message_attachments"."owner_id" = (select auth.uid())) WITH CHECK ("message_attachments"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "message_attachments_delete_own" ON "message_attachments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("message_attachments"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "messages_select_own" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "messages_insert_own" ON "messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "messages_update_own" ON "messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("messages"."owner_id" = (select auth.uid())) WITH CHECK ("messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "messages_delete_own" ON "messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "provsec_select_own" ON "provider_secrets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        exists (
          select 1 from "providers" p
          where p.id = "provider_secrets"."provider_id"
            and p.owner_id = (select auth.uid())
        )
      );--> statement-breakpoint
CREATE POLICY "provsec_insert_own" ON "provider_secrets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        exists (
          select 1 from "providers" p
          where p.id = "provider_secrets"."provider_id"
            and p.owner_id = (select auth.uid())
        )
        and exists (
          select 1 from "secrets_meta" s
          where s.id = "provider_secrets"."secret_id"
            and s.owner_id = (select auth.uid())
        )
      );--> statement-breakpoint
CREATE POLICY "provsec_update_own" ON "provider_secrets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        exists (
          select 1 from "providers" p
          where p.id = "provider_secrets"."provider_id"
            and p.owner_id = (select auth.uid())
        )
      ) WITH CHECK (
        exists (
          select 1 from "providers" p
          where p.id = "provider_secrets"."provider_id"
            and p.owner_id = (select auth.uid())
        )
        and exists (
          select 1 from "secrets_meta" s
          where s.id = "provider_secrets"."secret_id"
            and s.owner_id = (select auth.uid())
        )
      );--> statement-breakpoint
CREATE POLICY "provsec_delete_own" ON "provider_secrets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        exists (
          select 1 from "providers" p
          where p.id = "provider_secrets"."provider_id"
            and p.owner_id = (select auth.uid())
        )
      );--> statement-breakpoint
CREATE POLICY "providers_select_own" ON "providers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("providers"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "providers_insert_own" ON "providers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("providers"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "providers_update_own" ON "providers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("providers"."owner_id" = (select auth.uid())) WITH CHECK ("providers"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "providers_delete_own" ON "providers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("providers"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "select_own" ON "secrets_meta" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("secrets_meta"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "insert_own" ON "secrets_meta" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("secrets_meta"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "update_own" ON "secrets_meta" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("secrets_meta"."owner_id" = (select auth.uid())) WITH CHECK ("secrets_meta"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "delete_own" ON "secrets_meta" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("secrets_meta"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "smtpsec_select_own" ON "smtp_account_secrets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        exists (select 1 from "smtp_accounts" a
                where a.id = "smtp_account_secrets"."account_id"
                  and a.owner_id = (select auth.uid()))
      );--> statement-breakpoint
CREATE POLICY "smtpsec_insert_own" ON "smtp_account_secrets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        exists (select 1 from "smtp_accounts" a
                where a.id = "smtp_account_secrets"."account_id"
                  and a.owner_id = (select auth.uid()))
        and exists (select 1 from "secrets_meta" s
                    where s.id = "smtp_account_secrets"."secret_id"
                      and s.owner_id = (select auth.uid()))
      );--> statement-breakpoint
CREATE POLICY "smtpsec_update_own" ON "smtp_account_secrets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        exists (select 1 from "smtp_accounts" a
                where a.id = "smtp_account_secrets"."account_id"
                  and a.owner_id = (select auth.uid()))
      ) WITH CHECK (
        exists (select 1 from "smtp_accounts" a
                where a.id = "smtp_account_secrets"."account_id"
                  and a.owner_id = (select auth.uid()))
        and exists (select 1 from "secrets_meta" s
                    where s.id = "smtp_account_secrets"."secret_id"
                      and s.owner_id = (select auth.uid()))
      );--> statement-breakpoint
CREATE POLICY "smtpsec_delete_own" ON "smtp_account_secrets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        exists (select 1 from "smtp_accounts" a
                where a.id = "smtp_account_secrets"."account_id"
                  and a.owner_id = (select auth.uid()))
      );--> statement-breakpoint
CREATE POLICY "smtp_select_own" ON "smtp_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("smtp_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "smtp_insert_own" ON "smtp_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("smtp_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "smtp_update_own" ON "smtp_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("smtp_accounts"."owner_id" = (select auth.uid())) WITH CHECK ("smtp_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "smtp_delete_own" ON "smtp_accounts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("smtp_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_select_own" ON "threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_insert_own" ON "threads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_update_own" ON "threads" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("threads"."owner_id" = (select auth.uid())) WITH CHECK ("threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_delete_own" ON "threads" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("threads"."owner_id" = (select auth.uid()));
