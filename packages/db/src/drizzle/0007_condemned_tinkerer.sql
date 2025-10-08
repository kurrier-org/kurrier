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
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD CONSTRAINT "mailbox_threads_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_activity" ON "mailbox_threads" USING btree ("mailbox_id","last_activity_at","thread_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_slug" ON "mailbox_threads" USING btree ("identity_id","mailbox_slug");--> statement-breakpoint
CREATE INDEX "ix_mbth_identity_public_id" ON "mailbox_threads" USING btree ("identity_public_id");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_unread" ON "mailbox_threads" USING btree ("mailbox_id","unread_count");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_starred" ON "mailbox_threads" USING btree ("mailbox_id","starred");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_mbth_thread_mailbox" ON "mailbox_threads" USING btree ("thread_id","mailbox_id");--> statement-breakpoint
CREATE POLICY "mbth_select_own" ON "mailbox_threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_insert_own" ON "mailbox_threads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_update_own" ON "mailbox_threads" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mailbox_threads"."owner_id" = (select auth.uid())) WITH CHECK ("mailbox_threads"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbth_delete_own" ON "mailbox_threads" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mailbox_threads"."owner_id" = (select auth.uid()));