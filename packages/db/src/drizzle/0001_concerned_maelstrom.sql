CREATE TABLE "threads_list" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"mailbox_public_id" text NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"mailbox_slug" text,
	"subject" text,
	"preview_text" text,
	"last_activity_at" timestamp with time zone NOT NULL,
	"first_message_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"participants" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads_list" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "threads_list" ADD CONSTRAINT "threads_list_id_threads_id_fk" FOREIGN KEY ("id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads_list" ADD CONSTRAINT "threads_list_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads_list" ADD CONSTRAINT "threads_list_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads_list" ADD CONSTRAINT "threads_list_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_threads_list_mailbox_activity" ON "threads_list" USING btree ("mailbox_id","last_activity_at","id");--> statement-breakpoint
CREATE INDEX "ix_threads_list_mailbox_public_id" ON "threads_list" USING btree ("mailbox_public_id");--> statement-breakpoint
CREATE INDEX "ix_threads_list_identity_slug" ON "threads_list" USING btree ("identity_id","mailbox_slug");--> statement-breakpoint
CREATE INDEX "ix_threads_list_mailbox_unread" ON "threads_list" USING btree ("mailbox_id","unread_count");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_threads_list_thread_mailbox" ON "threads_list" USING btree ("id","mailbox_id");--> statement-breakpoint
CREATE POLICY "threads_list_select_own" ON "threads_list" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("threads_list"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_list_insert_own" ON "threads_list" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("threads_list"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_list_update_own" ON "threads_list" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("threads_list"."owner_id" = (select auth.uid())) WITH CHECK ("threads_list"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "threads_list_delete_own" ON "threads_list" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("threads_list"."owner_id" = (select auth.uid()));