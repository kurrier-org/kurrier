CREATE TYPE "public"."draft_message_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed');--> statement-breakpoint
CREATE TABLE "draft_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"status" "draft_message_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT null,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_draft_messages_owner" ON "draft_messages" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_mailbox" ON "draft_messages" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_status" ON "draft_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_scheduled_at" ON "draft_messages" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "ix_draft_messages_updated_at" ON "draft_messages" USING btree ("updated_at");--> statement-breakpoint
CREATE POLICY "draft_messages_select_own" ON "draft_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("draft_messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "draft_messages_insert_own" ON "draft_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("draft_messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "draft_messages_update_own" ON "draft_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("draft_messages"."owner_id" = (select auth.uid())) WITH CHECK ("draft_messages"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "draft_messages_delete_own" ON "draft_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("draft_messages"."owner_id" = (select auth.uid()));