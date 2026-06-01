--> statement-breakpoint
CREATE TYPE "public"."api_scope" AS ENUM('emails:send', 'emails:receive', 'templates:read', 'templates:write');--> statement-breakpoint
CREATE TYPE "public"."calendar_attendee_partstat" AS ENUM('needs_action', 'accepted', 'declined', 'tentative', 'delegated', 'in_process', 'completed');--> statement-breakpoint
CREATE TYPE "public"."calendar_attendee_role" AS ENUM('req_participant', 'opt_participant', 'non_participant', 'chair');--> statement-breakpoint
CREATE TYPE "public"."calendar_busy_status" AS ENUM('busy', 'free', 'tentative', 'out_of_office');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dav_account_type" AS ENUM('user', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."draft_message_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."drive_entry_type" AS ENUM('file', 'folder');--> statement-breakpoint
CREATE TYPE "public"."drive_upload_intent_scope" AS ENUM('home', 'cloud');--> statement-breakpoint
CREATE TYPE "public"."drive_volume_kind" AS ENUM('local', 'cloud');--> statement-breakpoint
CREATE TYPE "public"."identity_kind" AS ENUM('domain', 'email');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('unverified', 'pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."label_scope" AS ENUM('thread', 'contact', 'all');--> statement-breakpoint
CREATE TYPE "public"."mail_rule_action_type" AS ENUM('mark_read', 'flag', 'add_label', 'trash');--> statement-breakpoint
CREATE TYPE "public"."mail_subscription_status" AS ENUM('subscribed', 'unsubscribed', 'pending', 'failed');--> statement-breakpoint
CREATE TYPE "public"."mailbox_kind" AS ENUM('inbox', 'sent', 'drafts', 'archive', 'spam', 'trash', 'outbox', 'custom');--> statement-breakpoint
CREATE TYPE "public"."message_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."message_state" AS ENUM('normal', 'bounced', 'queued', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('smtp', 'ses', 'mailgun', 'postmark', 'sendgrid', 's3');--> statement-breakpoint
CREATE TYPE "public"."webhook_list" AS ENUM('message.received');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."mailbox_sync_phase" AS ENUM('BOOTSTRAP', 'BACKFILL', 'IDLE');--> statement-breakpoint
CREATE TABLE "address_books" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                 "dav_account_id" uuid NOT NULL,
                                 "dav_sync_token" text,
                                 "dav_address_book_id" integer,
                                 "name" text NOT NULL,
                                 "slug" text NOT NULL,
                                 "workspace_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "address_books" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_keys" (
                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                            "owner_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                            "name" text NOT NULL,
                            "secret_id" uuid NOT NULL,
                            "key_prefix" text NOT NULL,
                            "key_last4" text NOT NULL,
                            "key_version" integer DEFAULT 1 NOT NULL,
                            "scopes" "api_scope"[] NOT NULL,
                            "expires_at" timestamp with time zone,
                            "revoked_at" timestamp with time zone,
                            "meta" jsonb DEFAULT 'null'::jsonb,
                            "workspace_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                            "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_migrations" (
                                  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                  "version" text NOT NULL,
                                  "scope" text DEFAULT 'default' NOT NULL,
                                  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "user_id" uuid NOT NULL,
                                 "provider_id" uuid NOT NULL,
                                 "provider_user_id" text NOT NULL,
                                 "email" text NOT NULL,
                                 "email_verified" boolean DEFAULT false NOT NULL,
                                 "raw_profile" jsonb DEFAULT 'null'::jsonb,
                                 "workspace_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_providers" (
                                  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                  "owner_id" uuid DEFAULT
                                                            nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                  "workspace_id" uuid DEFAULT
                                                            nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                  "type" text DEFAULT 'oidc' NOT NULL,
                                  "name" text NOT NULL,
                                  "issuer_url" text NOT NULL,
                                  "client_id" text NOT NULL,
                                  "client_secret_id" uuid,
                                  "scopes" text DEFAULT 'openid email profile' NOT NULL,
                                  "enabled" boolean DEFAULT true NOT NULL,
                                  "meta" jsonb DEFAULT 'null'::jsonb,
                                  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_event_attendees" (
                                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                            "owner_id" uuid DEFAULT
                                                                      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                            "event_id" uuid NOT NULL,
                                            "email" text NOT NULL,
                                            "name" text,
                                            "role" "calendar_attendee_role" DEFAULT 'req_participant' NOT NULL,
                                            "partstat" "calendar_attendee_partstat" DEFAULT 'needs_action' NOT NULL,
                                            "rsvp" boolean DEFAULT false NOT NULL,
                                            "is_organizer" boolean DEFAULT false NOT NULL,
                                            "meta" jsonb DEFAULT 'null'::jsonb,
                                            "workspace_id" uuid DEFAULT
                                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_events" (
                                   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                   "owner_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                   "calendar_id" uuid NOT NULL,
                                   "organizer_identity_id" uuid,
                                   "organizer_email" text,
                                   "organizer_name" text,
                                   "title" text NOT NULL,
                                   "description" text,
                                   "location" text,
                                   "is_all_day" boolean DEFAULT false NOT NULL,
                                   "starts_at" timestamp with time zone NOT NULL,
                                   "ends_at" timestamp with time zone NOT NULL,
                                   "status" "calendar_event_status" DEFAULT 'confirmed' NOT NULL,
                                   "busy_status" "calendar_busy_status" DEFAULT 'busy' NOT NULL,
                                   "dav_etag" text,
                                   "dav_uri" text,
                                   "raw_ics" text,
                                   "ical_uid" text,
                                   "is_external" boolean DEFAULT false NOT NULL,
                                   "recurrence_rule" text,
                                   "recurrence_exdates" timestamp with time zone[] DEFAULT '{}'::timestamptz[] NOT NULL,
                                   "workspace_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                   "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendars" (
                             "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                             "owner_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                             "public_id" text NOT NULL,
                             "dav_account_id" uuid NOT NULL,
                             "dav_sync_token" text,
                             "dav_calendar_id" integer,
                             "identity_id" uuid DEFAULT null,
                             "name" text NOT NULL,
                             "slug" text NOT NULL,
                             "color" text,
                             "timezone" text DEFAULT 'UTC' NOT NULL,
                             "workspace_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                             "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                             "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_labels" (
                                  "contact_id" uuid NOT NULL,
                                  "label_id" uuid NOT NULL,
                                  "owner_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                  "workspace_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                  CONSTRAINT "pk_contact_labels" PRIMARY KEY("contact_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "contact_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                            "owner_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                            "public_id" text NOT NULL,
                            "profile_picture" text,
                            "profile_picture_xs" text,
                            "first_name" text NOT NULL,
                            "last_name" text,
                            "company" text,
                            "job_title" text,
                            "department" text,
                            "emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
                            "phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
                            "addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
                            "dob" text,
                            "notes" text,
                            "dav_etag" text,
                            "dav_uri" text,
                            "address_book_id" uuid NOT NULL,
                            "meta" jsonb DEFAULT 'null'::jsonb,
                            "workspace_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dav_accounts" (
                                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                "owner_id" uuid DEFAULT
                                                          nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                "type" "dav_account_type" DEFAULT 'user' NOT NULL,
                                "username" text NOT NULL,
                                "secret_id" uuid NOT NULL,
                                "base_path" text DEFAULT '/' NOT NULL,
                                "workspace_id" uuid DEFAULT
                                                          nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dav_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "draft_messages" (
                                  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                  "owner_id" uuid DEFAULT
                                                            nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                  "mailbox_id" uuid NOT NULL,
                                  "identity_id" uuid DEFAULT null,
                                  "status" "draft_message_status" DEFAULT 'draft' NOT NULL,
                                  "scheduled_at" timestamp with time zone DEFAULT null,
                                  "payload" jsonb NOT NULL,
                                  "workspace_id" uuid DEFAULT
                                                            nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "drive_entries" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                 "volume_id" uuid NOT NULL,
                                 "type" "drive_entry_type" DEFAULT 'file' NOT NULL,
                                 "path" text NOT NULL,
                                 "name" text NOT NULL,
                                 "size_bytes" bigint DEFAULT 0,
                                 "mime_type" text,
                                 "last_synced_at" timestamp with time zone,
                                 "meta" jsonb DEFAULT 'null'::jsonb,
                                 "workspace_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "drive_upload_intents" (
                                        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                        "owner_id" uuid DEFAULT
                                                                  nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                        "volume_id" uuid NOT NULL,
                                        "scope" "drive_upload_intent_scope" DEFAULT 'home' NOT NULL,
                                        "token" text NOT NULL,
                                        "target_path" text NOT NULL,
                                        "single_use" boolean DEFAULT true NOT NULL,
                                        "used_at" timestamp with time zone,
                                        "expires_at" timestamp with time zone NOT NULL,
                                        "workspace_id" uuid DEFAULT
                                                                  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "drive_volumes" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                 "public_id" text NOT NULL,
                                 "kind" "drive_volume_kind" DEFAULT 'local' NOT NULL,
                                 "code" text NOT NULL,
                                 "label" text NOT NULL,
                                 "base_path" text,
                                 "provider_id" uuid,
                                 "meta" jsonb DEFAULT 'null'::jsonb,
                                 "workspace_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_volumes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "identities" (
                              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                              "owner_id" uuid DEFAULT
                                                        nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                              "kind" "identity_kind" NOT NULL,
                              "public_id" text NOT NULL,
                              "value" text NOT NULL,
                              "display_name" text,
                              "incoming_domain" boolean DEFAULT false,
                              "shared_with_workspace" boolean DEFAULT false NOT NULL,
                              "domain_identity_id" uuid DEFAULT null,
                              "dns_records" jsonb DEFAULT 'null'::jsonb,
                              "meta" jsonb DEFAULT 'null'::jsonb,
                              "provider_id" uuid,
                              "smtp_account_id" uuid,
                              "status" "identity_status" DEFAULT 'unverified' NOT NULL,
                              "workspace_id" uuid DEFAULT
                                                        nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "labels" (
                          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                          "owner_id" uuid DEFAULT
                                                    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                          "public_id" text NOT NULL,
                          "name" text NOT NULL,
                          "slug" text NOT NULL,
                          "parent_id" uuid DEFAULT null,
                          "identity_id" uuid DEFAULT null,
                          "color_bg" text,
                          "color_text" text,
                          "is_system" boolean DEFAULT false NOT NULL,
                          "meta" jsonb DEFAULT 'null'::jsonb,
                          "scope" "label_scope" DEFAULT 'thread' NOT NULL,
                          "workspace_id" uuid DEFAULT
                                                    nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_rule_actions" (
                                     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                     "owner_id" uuid DEFAULT
                                                               nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                     "rule_id" uuid NOT NULL,
                                     "action_type" "mail_rule_action_type" NOT NULL,
                                     "order" integer DEFAULT 0 NOT NULL,
                                     "params" jsonb DEFAULT null,
                                     "workspace_id" uuid DEFAULT
                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_rules" (
                              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                              "owner_id" uuid DEFAULT
                                                        nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                              "identity_id" uuid NOT NULL,
                              "name" text NOT NULL,
                              "enabled" boolean DEFAULT true NOT NULL,
                              "priority" integer DEFAULT 100 NOT NULL,
                              "stop_processing" boolean DEFAULT false NOT NULL,
                              "match" jsonb NOT NULL,
                              "workspace_id" uuid DEFAULT
                                                        nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_subscriptions" (
                                      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                      "owner_id" uuid DEFAULT
                                                                nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                      "subscription_key" text NOT NULL,
                                      "list_id" text,
                                      "unsubscribe_http_url" text,
                                      "unsubscribe_mailto" text,
                                      "one_click" boolean DEFAULT false NOT NULL,
                                      "status" "mail_subscription_status" DEFAULT 'subscribed' NOT NULL,
                                      "last_seen_at" timestamp with time zone,
                                      "unsubscribed_at" timestamp with time zone,
                                      "workspace_id" uuid DEFAULT
                                                                nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
CREATE TABLE "mailbox_thread_labels" (
                                         "thread_id" uuid NOT NULL,
                                         "mailbox_id" uuid NOT NULL,
                                         "label_id" uuid NOT NULL,
                                         "owner_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                         "workspace_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                         "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                         CONSTRAINT "pk_mailbox_thread_labels" PRIMARY KEY("thread_id","mailbox_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mailbox_threads" (
                                   "thread_id" uuid NOT NULL,
                                   "mailbox_id" uuid NOT NULL,
                                   "owner_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
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
                                   "snoozed_until" timestamp with time zone DEFAULT null,
                                   "unsnoozed_at" timestamp with time zone DEFAULT null,
                                   "workspace_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                   "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
                                   CONSTRAINT "pk_mailbox_threads" PRIMARY KEY("thread_id","mailbox_id")
);
--> statement-breakpoint
ALTER TABLE "mailbox_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mailboxes" (
                             "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                             "owner_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                             "identity_id" uuid NOT NULL,
                             "parent_id" uuid DEFAULT null,
                             "public_id" text NOT NULL,
                             "kind" "mailbox_kind" DEFAULT 'inbox' NOT NULL,
                             "name" text,
                             "slug" text,
                             "is_default" boolean DEFAULT false NOT NULL,
                             "meta" jsonb DEFAULT 'null'::jsonb,
                             "workspace_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                             "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                             "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailboxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_attachments" (
                                       "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                       "owner_id" uuid DEFAULT
                                                                 nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                       "message_id" uuid NOT NULL,
                                       "bucket_id" text DEFAULT 'kurrier-store' NOT NULL,
                                       "path" text NOT NULL,
                                       "filename_original" text,
                                       "content_type" text,
                                       "size_bytes" integer,
                                       "cid" text,
                                       "is_inline" boolean DEFAULT false NOT NULL,
                                       "checksum" text,
                                       "workspace_id" uuid DEFAULT
                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                       "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                       "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                            "owner_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
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
                            "workspace_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_secrets" (
                                    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                    "provider_id" uuid NOT NULL,
                                    "secret_id" uuid NOT NULL,
                                    "workspace_id" uuid DEFAULT
                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "providers" (
                             "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                             "owner_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                             "type" "provider_kind" NOT NULL,
                             "meta" jsonb DEFAULT 'null'::jsonb,
                             "workspace_id" uuid DEFAULT
                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                             "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                             "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "secrets_meta" (
                                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                "owner_id" uuid DEFAULT
                                                          nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                "name" text NOT NULL,
                                "description" text,
                                "encrypted_value" text NOT NULL,
                                "iv" text NOT NULL,
                                "auth_tag" text NOT NULL,
                                "key_version" integer DEFAULT 1 NOT NULL,
                                "workspace_id" uuid DEFAULT
                                                          nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "secrets_meta" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "smtp_account_secrets" (
                                        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                        "account_id" uuid NOT NULL,
                                        "secret_id" uuid NOT NULL,
                                        "workspace_id" uuid DEFAULT
                                                                  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "smtp_accounts" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                 "workspace_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smtp_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "threads" (
                           "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                           "owner_id" uuid DEFAULT
                                                     nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                           "last_message_date" timestamp with time zone,
                           "last_message_id" uuid DEFAULT null,
                           "message_count" integer DEFAULT 0 NOT NULL,
                           "workspace_id" uuid DEFAULT
                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                           "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                           "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."users" (
                                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                "email" text NOT NULL,
                                "password_hash" text NOT NULL,
                                "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhooks" (
                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                            "owner_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                            "identity_id" uuid DEFAULT null,
                            "url" text NOT NULL,
                            "description" text,
                            "events" "webhook_list"[] NOT NULL,
                            "enabled" boolean DEFAULT true NOT NULL,
                            "meta" jsonb DEFAULT 'null'::jsonb,
                            "workspace_id" uuid DEFAULT
                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_identity_members" (
                                              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                              "workspace_id" uuid DEFAULT
                                                                        nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                              "identity_id" uuid NOT NULL,
                                              "user_id" uuid DEFAULT
                                                                        nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                              "meta" jsonb DEFAULT null,
                                              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_identity_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
                                     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                     "workspace_id" uuid NOT NULL,
                                     "user_id" uuid NOT NULL,
                                     "role" "workspace_role" DEFAULT 'member' NOT NULL,
                                     "meta" jsonb DEFAULT null,
                                     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
                              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                              "owner_id" uuid DEFAULT
                                                        nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                              "public_id" text NOT NULL,
                              "name" text NOT NULL,
                              "meta" jsonb DEFAULT null,
                              "default_identity_id" uuid DEFAULT null,
                              "storage_bytes_used" bigint DEFAULT 0 NOT NULL,
                              "is_storage_over_limit" boolean DEFAULT false NOT NULL,
                              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "address_books" ADD CONSTRAINT "address_books_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_books" ADD CONSTRAINT "address_books_dav_account_id_dav_accounts_id_fk" FOREIGN KEY ("dav_account_id") REFERENCES "public"."dav_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_books" ADD CONSTRAINT "address_books_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_provider_id_auth_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."auth_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_client_secret_id_secrets_meta_id_fk" FOREIGN KEY ("client_secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizer_identity_id_identities_id_fk" FOREIGN KEY ("organizer_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_dav_account_id_dav_accounts_id_fk" FOREIGN KEY ("dav_account_id") REFERENCES "public"."dav_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_address_book_id_address_books_id_fk" FOREIGN KEY ("address_book_id") REFERENCES "public"."address_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dav_accounts" ADD CONSTRAINT "dav_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dav_accounts" ADD CONSTRAINT "dav_accounts_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dav_accounts" ADD CONSTRAINT "dav_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_entries" ADD CONSTRAINT "drive_entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_entries" ADD CONSTRAINT "drive_entries_volume_id_drive_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "public"."drive_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_entries" ADD CONSTRAINT "drive_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ADD CONSTRAINT "drive_upload_intents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ADD CONSTRAINT "drive_upload_intents_volume_id_drive_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "public"."drive_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ADD CONSTRAINT "drive_upload_intents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_volumes" ADD CONSTRAINT "drive_volumes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_volumes" ADD CONSTRAINT "drive_volumes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_volumes" ADD CONSTRAINT "drive_volumes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_domain_identity_id_identities_id_fk" FOREIGN KEY ("domain_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_smtp_account_id_smtp_accounts_id_fk" FOREIGN KEY ("smtp_account_id") REFERENCES "public"."smtp_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_parent_id_labels_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ADD CONSTRAINT "mail_rule_actions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ADD CONSTRAINT "mail_rule_actions_rule_id_mail_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."mail_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ADD CONSTRAINT "mail_rule_actions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rules" ADD CONSTRAINT "mail_rules_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rules" ADD CONSTRAINT "mail_rules_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rules" ADD CONSTRAINT "mail_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_subscriptions" ADD CONSTRAINT "mail_subscriptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_subscriptions" ADD CONSTRAINT "mail_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_sync" ADD CONSTRAINT "mailbox_sync_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_sync" ADD CONSTRAINT "mailbox_sync_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_parent_id_mailboxes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_secrets" ADD CONSTRAINT "provider_secrets_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_secrets" ADD CONSTRAINT "provider_secrets_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_secrets" ADD CONSTRAINT "provider_secrets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets_meta" ADD CONSTRAINT "secrets_meta_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets_meta" ADD CONSTRAINT "secrets_meta_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ADD CONSTRAINT "smtp_account_secrets_account_id_smtp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."smtp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ADD CONSTRAINT "smtp_account_secrets_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_account_secrets" ADD CONSTRAINT "smtp_account_secrets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_accounts" ADD CONSTRAINT "smtp_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smtp_accounts" ADD CONSTRAINT "smtp_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_last_message_id_messages_id_fk" FOREIGN KEY ("last_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_identity_members" ADD CONSTRAINT "workspace_identity_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_identity_members" ADD CONSTRAINT "workspace_identity_members_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_identity_members" ADD CONSTRAINT "workspace_identity_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_default_identity_id_identities_id_fk" FOREIGN KEY ("default_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_address_books_dav_id" ON "address_books" USING btree ("dav_address_book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_address_books_workspace_owner" ON "address_books" USING btree ("workspace_id","owner_id");--> statement-breakpoint
CREATE INDEX "ix_address_books_owner" ON "address_books" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_address_books_dav_account" ON "address_books" USING btree ("dav_account_id");--> statement-breakpoint
CREATE INDEX "ix_api_keys_workspace" ON "api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_api_keys_workspace_name" ON "api_keys" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_api_keys_workspace_prefix" ON "api_keys" USING btree ("workspace_id","key_prefix");--> statement-breakpoint
CREATE INDEX "ix_api_keys_workspace_owner" ON "api_keys" USING btree ("workspace_id","owner_id");--> statement-breakpoint
CREATE INDEX "ix_api_keys_expires" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ix_api_keys_revoked" ON "api_keys" USING btree ("revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_migrations_scope_version" ON "app_migrations" USING btree ("scope","version");--> statement-breakpoint
CREATE INDEX "ix_auth_accounts_workspace" ON "auth_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_auth_accounts_user" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_auth_accounts_provider" ON "auth_accounts" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_auth_account_provider_subject" ON "auth_accounts" USING btree ("provider_id","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_auth_account_workspace_email_provider" ON "auth_accounts" USING btree ("workspace_id","email","provider_id");--> statement-breakpoint
CREATE INDEX "ix_auth_providers_workspace" ON "auth_providers" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_auth_provider_workspace_name" ON "auth_providers" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "ix_event_attendees_owner" ON "calendar_event_attendees" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_event_attendees_event" ON "calendar_event_attendees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ix_event_attendees_email" ON "calendar_event_attendees" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_event_attendees_event_email" ON "calendar_event_attendees" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX "ix_calendar_events_owner" ON "calendar_events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_calendar_events_calendar" ON "calendar_events" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "ix_calendar_events_calendar_start" ON "calendar_events" USING btree ("calendar_id","starts_at");--> statement-breakpoint
CREATE INDEX "ix_calendar_events_calendar_dav_uri" ON "calendar_events" USING btree ("calendar_id","dav_uri");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_calendar_events_calendar_ical_uid" ON "calendar_events" USING btree ("calendar_id","ical_uid") WHERE "calendar_events"."ical_uid" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_calendars_workspace_slug" ON "calendars" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_calendar_workspace_identity" ON "calendars" USING btree ("workspace_id","identity_id");--> statement-breakpoint
CREATE INDEX "ix_calendars_owner" ON "calendars" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_calendars_dav_account" ON "calendars" USING btree ("dav_account_id");--> statement-breakpoint
CREATE INDEX "ix_contact_labels_label" ON "contact_labels" USING btree ("label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_contacts_workspace_public_id" ON "contacts" USING btree ("workspace_id","public_id");--> statement-breakpoint
CREATE INDEX "ix_contacts_workspace" ON "contacts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_contacts_workspace_name" ON "contacts" USING btree ("workspace_id","last_name","first_name");--> statement-breakpoint
CREATE INDEX "ix_contacts_address_book" ON "contacts" USING btree ("address_book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_dav_workspace_account" ON "dav_accounts" USING btree ("workspace_id") WHERE "dav_accounts"."type" = 'workspace';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_dav_username" ON "dav_accounts" USING btree ("username");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_owner" ON "draft_messages" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_mailbox" ON "draft_messages" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_identity" ON "draft_messages" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_status" ON "draft_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_scheduled_at" ON "draft_messages" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_updated_at" ON "draft_messages" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_entries_owner_volume_path" ON "drive_entries" USING btree ("owner_id","volume_id","path");--> statement-breakpoint
CREATE INDEX "ix_drive_entries_owner" ON "drive_entries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_drive_entries_volume" ON "drive_entries" USING btree ("volume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_upload_intents_token" ON "drive_upload_intents" USING btree ("token");--> statement-breakpoint
CREATE INDEX "ix_drive_upload_intents_owner" ON "drive_upload_intents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_drive_upload_intents_volume" ON "drive_upload_intents" USING btree ("volume_id");--> statement-breakpoint
CREATE INDEX "ix_drive_upload_intents_expires" ON "drive_upload_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_volumes_workspace_code" ON "drive_volumes" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_volumes_public_id" ON "drive_volumes" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "ix_drive_volumes_owner" ON "drive_volumes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_drive_volumes_provider" ON "drive_volumes" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ix_identities_workspace" ON "identities" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identity_per_workspace" ON "identities" USING btree ("workspace_id","kind","value");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identity_public_id" ON "identities" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_label_workspace_scope_slug" ON "labels" USING btree ("workspace_id","scope","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mail_rule_actions_rule_order" ON "mail_rule_actions" USING btree ("rule_id","order");--> statement-breakpoint
CREATE INDEX "idx_mail_rule_actions_rule" ON "mail_rule_actions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_mail_rules_owner_identity" ON "mail_rules" USING btree ("owner_id","identity_id");--> statement-breakpoint
CREATE INDEX "idx_mail_rules_owner_enabled_priority" ON "mail_rules" USING btree ("owner_id","enabled","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mail_subscriptions_workspace_key" ON "mail_subscriptions" USING btree ("workspace_id","subscription_key");--> statement-breakpoint
CREATE INDEX "idx_mail_subscriptions_status" ON "mail_subscriptions" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "idx_mail_subscriptions_last_seen" ON "mail_subscriptions" USING btree ("owner_id","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_mailbox_sync_mailbox" ON "mailbox_sync" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "ix_mailbox_sync_identity" ON "mailbox_sync" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_mailbox_sync_phase" ON "mailbox_sync" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "ix_mbtlabel_mailbox_label" ON "mailbox_thread_labels" USING btree ("mailbox_id","label_id");--> statement-breakpoint
CREATE INDEX "ix_mbtlabel_label" ON "mailbox_thread_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "ix_mailbox_threads_workspace" ON "mailbox_threads" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_activity" ON "mailbox_threads" USING btree ("mailbox_id","last_activity_at","thread_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_slug_effective_activity" ON "mailbox_threads" USING btree ("identity_public_id","mailbox_slug",COALESCE("unsnoozed_at", "last_activity_at"),"last_activity_at","thread_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_slug" ON "mailbox_threads" USING btree ("identity_id","mailbox_slug");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_public_id" ON "mailbox_threads" USING btree ("identity_public_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_unread" ON "mailbox_threads" USING btree ("mailbox_id","unread_count");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_starred" ON "mailbox_threads" USING btree ("mailbox_id","starred");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_snoozed_until" ON "mailbox_threads" USING btree ("mailbox_id","snoozed_until");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_unsnoozed_at" ON "mailbox_threads" USING btree ("mailbox_id","unsnoozed_at");--> statement-breakpoint
CREATE INDEX "ix_mailboxes_workspace" ON "mailboxes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mailbox_public_id" ON "mailboxes" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_default_mailbox_per_kind" ON "mailboxes" USING btree ("identity_id","kind") WHERE "mailboxes"."is_default" IS TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mailbox_slug_per_identity" ON "mailboxes" USING btree ("identity_id","slug") WHERE "mailboxes"."slug" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_mailbox_parent" ON "mailboxes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "ix_message_attachments_workspace" ON "message_attachments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_msg_attachments_message" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_bucket_path" ON "message_attachments" USING btree ("bucket_id","path");--> statement-breakpoint
CREATE INDEX "idx_msg_attachments_cid" ON "message_attachments" USING btree ("cid");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_message_public_id" ON "messages" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "idx_messages_priority" ON "messages" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "ix_messages_workspace" ON "messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mailbox_message_id" ON "messages" USING btree ("mailbox_id","message_id");--> statement-breakpoint
CREATE INDEX "idx_messages_in_reply_to" ON "messages" USING btree ("in_reply_to");--> statement-breakpoint
CREATE INDEX "ix_messages_thread_flagged" ON "messages" USING btree ("thread_id","flagged");--> statement-breakpoint
CREATE INDEX "idx_messages_mailbox_date" ON "messages" USING btree ("mailbox_id","date");--> statement-breakpoint
CREATE INDEX "idx_messages_mailbox_seen_date" ON "messages" USING btree ("mailbox_id","seen","date");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_provider_secret" ON "provider_secrets" USING btree ("provider_id","secret_id");--> statement-breakpoint
CREATE INDEX "ix_provider_secret_provider" ON "provider_secrets" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ix_provider_secret_secret" ON "provider_secrets" USING btree ("secret_id");--> statement-breakpoint
CREATE INDEX "ix_provider_secret_secret_provider" ON "provider_secrets" USING btree ("secret_id","provider_id");--> statement-breakpoint
CREATE INDEX "ix_providers_workspace" ON "providers" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_providers_owner_type_workspace" ON "providers" USING btree ("owner_id","type","workspace_id");--> statement-breakpoint
CREATE INDEX "ix_secrets_meta_workspace" ON "secrets_meta" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_secrets_meta_owner" ON "secrets_meta" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_secrets_meta_workspace_name" ON "secrets_meta" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_smtp_account_secret" ON "smtp_account_secrets" USING btree ("account_id","secret_id");--> statement-breakpoint
CREATE INDEX "ix_smtp_account_secret_secret" ON "smtp_account_secrets" USING btree ("secret_id");--> statement-breakpoint
CREATE INDEX "ix_smtp_accounts_workspace" ON "smtp_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_threads_workspace" ON "threads" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_users_email" ON "auth"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_webhooks_workspace" ON "webhooks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_webhooks_identity" ON "webhooks" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_webhooks_enabled" ON "webhooks" USING btree ("workspace_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_identity_member_unique" ON "workspace_identity_members" USING btree ("workspace_id","identity_id","user_id");--> statement-breakpoint
CREATE INDEX "ix_identity_members_workspace" ON "workspace_identity_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_identity_members_identity" ON "workspace_identity_members" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_identity_members_user" ON "workspace_identity_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_wim_user_identity" ON "workspace_identity_members" USING btree ("user_id","identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_workspace_member" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_workspace" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_user" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_workspace_public_id" ON "workspaces" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_owner" ON "workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE POLICY "address_books_select" ON "address_books" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("address_books"."owner_id" =
                                                                              nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
                                                                              AND "address_books"."workspace_id" =
                                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                              );--> statement-breakpoint
CREATE POLICY "address_books_insert_workspace" ON "address_books" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("address_books"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "address_books_update_workspace" ON "address_books" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("address_books"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               ) WITH CHECK ("address_books"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               );--> statement-breakpoint
CREATE POLICY "address_books_delete_workspace" ON "address_books" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("address_books"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "api_keys_select_workspace" ON "api_keys" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("api_keys"."workspace_id" =
                                                                                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                         );--> statement-breakpoint
CREATE POLICY "api_keys_insert_workspace" ON "api_keys" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("api_keys"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "api_keys_update_workspace" ON "api_keys" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("api_keys"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     ) WITH CHECK ("api_keys"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     );--> statement-breakpoint
CREATE POLICY "api_keys_delete_workspace" ON "api_keys" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("api_keys"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "auth_accounts_select_workspace" ON "auth_accounts" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("auth_accounts"."workspace_id" =
                                                                                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                         );--> statement-breakpoint
CREATE POLICY "auth_accounts_insert_workspace" ON "auth_accounts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("auth_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "auth_accounts_update_workspace" ON "auth_accounts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("auth_accounts"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               ) WITH CHECK ("auth_accounts"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               );--> statement-breakpoint
CREATE POLICY "auth_accounts_delete_workspace" ON "auth_accounts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("auth_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "auth_providers_select_workspace" ON "auth_providers" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("auth_providers"."workspace_id" =
                                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "auth_providers_insert_workspace" ON "auth_providers" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("auth_providers"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "auth_providers_update_workspace" ON "auth_providers" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("auth_providers"."workspace_id" =
                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                 ) WITH CHECK ("auth_providers"."workspace_id" =
                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                 );--> statement-breakpoint
CREATE POLICY "auth_providers_delete_workspace" ON "auth_providers" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("auth_providers"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_select_workspace" ON "calendar_event_attendees" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("calendar_event_attendees"."workspace_id" =
                                                                                                                                                                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                           );--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_insert_workspace" ON "calendar_event_attendees" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("calendar_event_attendees"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_update_workspace" ON "calendar_event_attendees" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("calendar_event_attendees"."workspace_id" =
                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                     ) WITH CHECK ("calendar_event_attendees"."workspace_id" =
                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                     );--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_delete_workspace" ON "calendar_event_attendees" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("calendar_event_attendees"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "calendar_events_select_workspace" ON "calendar_events" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("calendar_events"."workspace_id" =
                                                                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                             );--> statement-breakpoint
CREATE POLICY "calendar_events_insert_workspace" ON "calendar_events" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("calendar_events"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "calendar_events_update_workspace" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("calendar_events"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   ) WITH CHECK ("calendar_events"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   );--> statement-breakpoint
CREATE POLICY "calendar_events_delete_workspace" ON "calendar_events" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("calendar_events"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "calendars_select" ON "calendars" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                                     "calendars"."workspace_id" =
                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                     AND EXISTS (
                                                                                                                                                                     SELECT 1
                                                                                                                                                                     FROM identities i
                                                                                                                                                                     WHERE
                                                                                                                                                                     i.id = "calendars"."identity_id"
                                                                                                                                                                     AND i.workspace_id =
                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                     AND (
                                                                                                                                                                     i.shared_with_workspace = true
                                                                                                                                                                     OR EXISTS (
                                                                                                                                                                     SELECT 1
                                                                                                                                                                     FROM workspace_identity_members wim
                                                                                                                                                                     WHERE
                                                                                                                                                                     wim.workspace_id =
                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                     AND wim.user_id =
                                                                                                                                                                     nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                                     AND wim.identity_id = i.id
                                                                                                                                                                     )
                                                                                                                                                                     )
                                                                                                                                                                     )
                                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "calendars_insert_workspace" ON "calendars" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("calendars"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "calendars_update_workspace" ON "calendars" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("calendars"."workspace_id" =
                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                       ) WITH CHECK ("calendars"."workspace_id" =
                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                       );--> statement-breakpoint
CREATE POLICY "calendars_delete_workspace" ON "calendars" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("calendars"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "contact_labels_select" ON "contact_labels" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                                   "contact_labels"."workspace_id" =
                                                                                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                   AND EXISTS (
                                                                                                                                                                   SELECT 1
                                                                                                                                                                   FROM contacts c
                                                                                                                                                                   WHERE c.id = "contact_labels"."contact_id"
                                                                                                                                                                   )
                                                                                                                                                                   );--> statement-breakpoint
CREATE POLICY "contact_labels_insert_workspace" ON "contact_labels" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("contact_labels"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "contact_labels_update_workspace" ON "contact_labels" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("contact_labels"."workspace_id" =
                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                 ) WITH CHECK ("contact_labels"."workspace_id" =
                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                 );--> statement-breakpoint
CREATE POLICY "contact_labels_delete_workspace" ON "contact_labels" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("contact_labels"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "contacts_select" ON "contacts" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                                 "contacts"."workspace_id" =
                                                                                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                 AND EXISTS (
                                                                                                                                                                 SELECT 1
                                                                                                                                                                 FROM address_books ab
                                                                                                                                                                 WHERE
                                                                                                                                                                 ab.id = "contacts"."address_book_id"
                                                                                                                                                                 AND ab.workspace_id =
                                                                                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                 AND ab.owner_id =
                                                                                                                                                                 nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                                 )
                                                                                                                                                                 );--> statement-breakpoint
CREATE POLICY "contacts_insert_workspace" ON "contacts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("contacts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "contacts_update_workspace" ON "contacts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("contacts"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     ) WITH CHECK ("contacts"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     );--> statement-breakpoint
CREATE POLICY "contacts_delete_workspace" ON "contacts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("contacts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "dav_accounts_select" ON "dav_accounts" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                             "dav_accounts"."workspace_id" =
                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                             AND (
                                                                                                                                                             (
                                                                                                                                                             "dav_accounts"."type" = 'user'
                                                                                                                                                             AND "dav_accounts"."owner_id" =
                                                                                                                                                             nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                             )
                                                                                                                                                             OR "dav_accounts"."type" = 'workspace'
                                                                                                                                                             )
                                                                                                                                                             );--> statement-breakpoint
CREATE POLICY "dav_accounts_insert_workspace" ON "dav_accounts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("dav_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "dav_accounts_update_workspace" ON "dav_accounts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("dav_accounts"."workspace_id" =
                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                             ) WITH CHECK ("dav_accounts"."workspace_id" =
                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                             );--> statement-breakpoint
CREATE POLICY "dav_accounts_delete_workspace" ON "dav_accounts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("dav_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "draft_messages_select_workspace" ON "draft_messages" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("draft_messages"."workspace_id" =
                                                                                                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                   );--> statement-breakpoint
CREATE POLICY "draft_messages_insert_workspace" ON "draft_messages" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("draft_messages"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "draft_messages_update_workspace" ON "draft_messages" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("draft_messages"."workspace_id" =
                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                 ) WITH CHECK ("draft_messages"."workspace_id" =
                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                 );--> statement-breakpoint
CREATE POLICY "draft_messages_delete_workspace" ON "draft_messages" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("draft_messages"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_entries_select_workspace" ON "drive_entries" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("drive_entries"."workspace_id" =
                                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "drive_entries_insert_workspace" ON "drive_entries" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("drive_entries"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_entries_update_workspace" ON "drive_entries" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("drive_entries"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               ) WITH CHECK ("drive_entries"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               );--> statement-breakpoint
CREATE POLICY "drive_entries_delete_workspace" ON "drive_entries" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("drive_entries"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_upload_intents_select_workspace" ON "drive_upload_intents" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("drive_upload_intents"."workspace_id" =
                                                                                                                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                 );--> statement-breakpoint
CREATE POLICY "drive_upload_intents_insert_workspace" ON "drive_upload_intents" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("drive_upload_intents"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_upload_intents_update_workspace" ON "drive_upload_intents" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("drive_upload_intents"."workspace_id" =
                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                             ) WITH CHECK ("drive_upload_intents"."workspace_id" =
                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                             );--> statement-breakpoint
CREATE POLICY "drive_upload_intents_delete_workspace" ON "drive_upload_intents" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("drive_upload_intents"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_volumes_select_workspace" ON "drive_volumes" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("drive_volumes"."workspace_id" =
                                                                                                                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                 );--> statement-breakpoint
CREATE POLICY "drive_volumes_insert_workspace" ON "drive_volumes" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("drive_volumes"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_volumes_update_workspace" ON "drive_volumes" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("drive_volumes"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               ) WITH CHECK ("drive_volumes"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               );--> statement-breakpoint
CREATE POLICY "drive_volumes_delete_workspace" ON "drive_volumes" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("drive_volumes"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "identities_select" ON "identities" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                                   "identities"."workspace_id" =
                                                                                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                   AND (
                                                                                                                                                                   "identities"."kind" = 'domain'
                                                                                                                                                                   OR "identities"."shared_with_workspace" = true
                                                                                                                                                                   OR EXISTS (
                                                                                                                                                                   SELECT 1
                                                                                                                                                                   FROM workspace_identity_members wim
                                                                                                                                                                   WHERE
                                                                                                                                                                   wim.user_id =
                                                                                                                                                                   nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                                   AND wim.identity_id = "identities"."id"
                                                                                                                                                                   )
                                                                                                                                                                   )
                                                                                                                                                                   );--> statement-breakpoint
CREATE POLICY "identities_insert_workspace" ON "identities" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("identities"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "identities_update_workspace" ON "identities" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("identities"."workspace_id" =
                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                         ) WITH CHECK ("identities"."workspace_id" =
                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                         );--> statement-breakpoint
CREATE POLICY "identities_delete_workspace" ON "identities" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("identities"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "labels_select" ON "labels" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                     "labels"."workspace_id" =
                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                     AND (
                                                                                                                                                     "labels"."identity_id" IS NULL
                                                                                                                                                     OR
                                                                                                                                                     "labels"."workspace_id" =
                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                     AND EXISTS (
                                                                                                                                                     SELECT 1
                                                                                                                                                     FROM identities i
                                                                                                                                                     WHERE
                                                                                                                                                     i.id = "labels"."identity_id"
                                                                                                                                                     AND i.workspace_id =
                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                     AND (
                                                                                                                                                     i.shared_with_workspace = true
                                                                                                                                                     OR EXISTS (
                                                                                                                                                     SELECT 1
                                                                                                                                                     FROM workspace_identity_members wim
                                                                                                                                                     WHERE
                                                                                                                                                     wim.workspace_id =
                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                     AND wim.user_id =
                                                                                                                                                     nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                     AND wim.identity_id = i.id
                                                                                                                                                     )
                                                                                                                                                     )
                                                                                                                                                     )

                                                                                                                                                     )
                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "labels_insert_workspace" ON "labels" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("labels"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "labels_update_workspace" ON "labels" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("labels"."workspace_id" =
                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                 ) WITH CHECK ("labels"."workspace_id" =
                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                 );--> statement-breakpoint
CREATE POLICY "labels_delete_workspace" ON "labels" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("labels"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mail_rule_actions_select_workspace" ON "mail_rule_actions" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("mail_rule_actions"."workspace_id" =
                                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                             );--> statement-breakpoint
CREATE POLICY "mail_rule_actions_insert_workspace" ON "mail_rule_actions" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("mail_rule_actions"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mail_rule_actions_update_workspace" ON "mail_rule_actions" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("mail_rule_actions"."workspace_id" =
                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                       ) WITH CHECK ("mail_rule_actions"."workspace_id" =
                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                       );--> statement-breakpoint
CREATE POLICY "mail_rule_actions_delete_workspace" ON "mail_rule_actions" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("mail_rule_actions"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mail_rules_select_workspace" ON "mail_rules" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("mail_rules"."workspace_id" =
                                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "mail_rules_insert_workspace" ON "mail_rules" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("mail_rules"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mail_rules_update_workspace" ON "mail_rules" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("mail_rules"."workspace_id" =
                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                         ) WITH CHECK ("mail_rules"."workspace_id" =
                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                         );--> statement-breakpoint
CREATE POLICY "mail_rules_delete_workspace" ON "mail_rules" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("mail_rules"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mail_subscriptions_select_workspace" ON "mail_subscriptions" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("mail_subscriptions"."workspace_id" =
                                                                                                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                       );--> statement-breakpoint
CREATE POLICY "mail_subscriptions_insert_workspace" ON "mail_subscriptions" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("mail_subscriptions"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mail_subscriptions_update_workspace" ON "mail_subscriptions" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("mail_subscriptions"."workspace_id" =
                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                         ) WITH CHECK ("mail_subscriptions"."workspace_id" =
                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                         );--> statement-breakpoint
CREATE POLICY "mail_subscriptions_delete_workspace" ON "mail_subscriptions" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("mail_subscriptions"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mailbox_thread_labels_select_workspace" ON "mailbox_thread_labels" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("mailbox_thread_labels"."workspace_id" =
                                                                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                             );--> statement-breakpoint
CREATE POLICY "mailbox_thread_labels_insert_workspace" ON "mailbox_thread_labels" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("mailbox_thread_labels"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mailbox_thread_labels_update_workspace" ON "mailbox_thread_labels" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("mailbox_thread_labels"."workspace_id" =
                                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                               ) WITH CHECK ("mailbox_thread_labels"."workspace_id" =
                                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                               );--> statement-breakpoint
CREATE POLICY "mailbox_thread_labels_delete_workspace" ON "mailbox_thread_labels" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("mailbox_thread_labels"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mailbox_threads_select" ON "mailbox_threads" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                                                             "mailbox_threads"."workspace_id" =
                                                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                                             AND EXISTS (
                                                                                                                                                                                             SELECT 1
                                                                                                                                                                                             FROM identities i
                                                                                                                                                                                             WHERE
                                                                                                                                                                                             i.id = "mailbox_threads"."identity_id"
                                                                                                                                                                                             AND i.workspace_id =
                                                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                                             AND (
                                                                                                                                                                                             i.shared_with_workspace = true
                                                                                                                                                                                             OR EXISTS (
                                                                                                                                                                                             SELECT 1
                                                                                                                                                                                             FROM workspace_identity_members wim
                                                                                                                                                                                             WHERE
                                                                                                                                                                                             wim.workspace_id =
                                                                                                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                                             AND wim.user_id =
                                                                                                                                                                                             nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                                                             AND wim.identity_id = i.id
                                                                                                                                                                                             )
                                                                                                                                                                                             )
                                                                                                                                                                                             )
                                                                                                                                                                                             );--> statement-breakpoint
CREATE POLICY "mailbox_threads_insert_workspace" ON "mailbox_threads" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("mailbox_threads"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mailbox_threads_update_workspace" ON "mailbox_threads" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("mailbox_threads"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   ) WITH CHECK ("mailbox_threads"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   );--> statement-breakpoint
CREATE POLICY "mailbox_threads_delete_workspace" ON "mailbox_threads" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("mailbox_threads"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mailboxes_select_workspace" ON "mailboxes" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("mailboxes"."workspace_id" =
                                                                                                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                               );--> statement-breakpoint
CREATE POLICY "mailboxes_insert_workspace" ON "mailboxes" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("mailboxes"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "mailboxes_update_workspace" ON "mailboxes" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("mailboxes"."workspace_id" =
                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                       ) WITH CHECK ("mailboxes"."workspace_id" =
                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                       );--> statement-breakpoint
CREATE POLICY "mailboxes_delete_workspace" ON "mailboxes" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("mailboxes"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "message_attachments_select_workspace" ON "message_attachments" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("message_attachments"."workspace_id" =
                                                                                                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                       );--> statement-breakpoint
CREATE POLICY "message_attachments_insert_workspace" ON "message_attachments" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("message_attachments"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "message_attachments_update_workspace" ON "message_attachments" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("message_attachments"."workspace_id" =
                                                                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                           ) WITH CHECK ("message_attachments"."workspace_id" =
                                                                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                           );--> statement-breakpoint
CREATE POLICY "message_attachments_delete_workspace" ON "message_attachments" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("message_attachments"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "messages_select_workspace" ON "messages" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("messages"."workspace_id" =
                                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "messages_insert_workspace" ON "messages" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("messages"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "messages_update_workspace" ON "messages" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("messages"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     ) WITH CHECK ("messages"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     );--> statement-breakpoint
CREATE POLICY "messages_delete_workspace" ON "messages" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("messages"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "provider_secrets_select_workspace" ON "provider_secrets" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("provider_secrets"."workspace_id" =
                                                                                                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                               );--> statement-breakpoint
CREATE POLICY "provider_secrets_insert_workspace" ON "provider_secrets" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("provider_secrets"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "provider_secrets_update_workspace" ON "provider_secrets" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("provider_secrets"."workspace_id" =
                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                     ) WITH CHECK ("provider_secrets"."workspace_id" =
                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                     );--> statement-breakpoint
CREATE POLICY "provider_secrets_delete_workspace" ON "provider_secrets" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("provider_secrets"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "providers_select_workspace" ON "providers" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("providers"."workspace_id" =
                                                                                                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                 );--> statement-breakpoint
CREATE POLICY "providers_insert_workspace" ON "providers" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("providers"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "providers_update_workspace" ON "providers" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("providers"."workspace_id" =
                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                       ) WITH CHECK ("providers"."workspace_id" =
                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                       );--> statement-breakpoint
CREATE POLICY "providers_delete_workspace" ON "providers" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("providers"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "secrets_meta_select_workspace" ON "secrets_meta" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("secrets_meta"."workspace_id" =
                                                                                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                         );--> statement-breakpoint
CREATE POLICY "secrets_meta_insert_workspace" ON "secrets_meta" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("secrets_meta"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "secrets_meta_update_workspace" ON "secrets_meta" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("secrets_meta"."workspace_id" =
                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                             ) WITH CHECK ("secrets_meta"."workspace_id" =
                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                             );--> statement-breakpoint
CREATE POLICY "secrets_meta_delete_workspace" ON "secrets_meta" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("secrets_meta"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "smtp_account_secrets_select_workspace" ON "smtp_account_secrets" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("smtp_account_secrets"."workspace_id" =
                                                                                                                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                               );--> statement-breakpoint
CREATE POLICY "smtp_account_secrets_insert_workspace" ON "smtp_account_secrets" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("smtp_account_secrets"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "smtp_account_secrets_update_workspace" ON "smtp_account_secrets" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("smtp_account_secrets"."workspace_id" =
                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                             ) WITH CHECK ("smtp_account_secrets"."workspace_id" =
                                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                             );--> statement-breakpoint
CREATE POLICY "smtp_account_secrets_delete_workspace" ON "smtp_account_secrets" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("smtp_account_secrets"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "smtp_accounts_select_workspace" ON "smtp_accounts" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("smtp_accounts"."workspace_id" =
                                                                                                                                                                                                 nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                 );--> statement-breakpoint
CREATE POLICY "smtp_accounts_insert_workspace" ON "smtp_accounts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("smtp_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "smtp_accounts_update_workspace" ON "smtp_accounts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("smtp_accounts"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               ) WITH CHECK ("smtp_accounts"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               );--> statement-breakpoint
CREATE POLICY "smtp_accounts_delete_workspace" ON "smtp_accounts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("smtp_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "threads_select_workspace" ON "threads" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("threads"."workspace_id" =
                                                                                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                       );--> statement-breakpoint
CREATE POLICY "threads_insert_workspace" ON "threads" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("threads"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "threads_update_workspace" ON "threads" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("threads"."workspace_id" =
                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                   ) WITH CHECK ("threads"."workspace_id" =
                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                   );--> statement-breakpoint
CREATE POLICY "threads_delete_workspace" ON "threads" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("threads"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "users_select_self" ON "auth"."users" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("auth"."users"."id" =
                                                                                                                                                         nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
                                                                                                                                                         );--> statement-breakpoint
CREATE POLICY "users_update_self" ON "auth"."users" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("auth"."users"."id" =
                                                                          nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
                                                                          ) WITH CHECK ("auth"."users"."id" =
                                                                          nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
                                                                          );--> statement-breakpoint
CREATE POLICY "webhooks_select_workspace" ON "webhooks" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("webhooks"."workspace_id" =
                                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                              );--> statement-breakpoint
CREATE POLICY "webhooks_insert_workspace" ON "webhooks" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("webhooks"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "webhooks_update_workspace" ON "webhooks" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("webhooks"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     ) WITH CHECK ("webhooks"."workspace_id" =
                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                     );--> statement-breakpoint
CREATE POLICY "webhooks_delete_workspace" ON "webhooks" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("webhooks"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "workspace_identity_members_select" ON "workspace_identity_members" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                                                                                                                                         "workspace_identity_members"."workspace_id" =
                                                                                                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                                                                                                                                         AND "workspace_identity_members"."user_id" =
                                                                                                                                                                                         nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                                                                                                                                         );--> statement-breakpoint
CREATE POLICY "workspace_identity_members_insert_workspace" ON "workspace_identity_members" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("workspace_identity_members"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "workspace_identity_members_update_workspace" ON "workspace_identity_members" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("workspace_identity_members"."workspace_id" =
                                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                         ) WITH CHECK ("workspace_identity_members"."workspace_id" =
                                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                         );--> statement-breakpoint
CREATE POLICY "workspace_identity_members_delete_workspace" ON "workspace_identity_members" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("workspace_identity_members"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "workspace_members_select_workspace" ON "workspace_members" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("workspace_members"."workspace_id" =
                                                                                                                                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                                                     );--> statement-breakpoint
CREATE POLICY "workspace_members_insert_workspace" ON "workspace_members" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("workspace_members"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "workspace_members_update_workspace" ON "workspace_members" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("workspace_members"."workspace_id" =
                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                       ) WITH CHECK ("workspace_members"."workspace_id" =
                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                       );--> statement-breakpoint
CREATE POLICY "workspace_members_delete_workspace" ON "workspace_members" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("workspace_members"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "workspaces_select_active" ON "workspaces" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("workspaces"."id" =
                                                                                                                                                                                  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                                                                                                  );--> statement-breakpoint
CREATE POLICY "workspaces_update_active" ON "workspaces" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("workspaces"."id" =
                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                               ) WITH CHECK ("workspaces"."id" =
                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                               );--> statement-breakpoint
CREATE POLICY "workspaces_delete_active" ON "workspaces" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("workspaces"."id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "workspaces_insert" ON "workspaces" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("workspaces"."owner_id" =
  nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
);
