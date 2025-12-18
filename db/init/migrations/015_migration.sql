ALTER TABLE "draft_messages" ALTER COLUMN "mailbox_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "draft_messages" ALTER COLUMN "mailbox_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD COLUMN "snoozed_until" timestamp with time zone DEFAULT null;--> statement-breakpoint
ALTER TABLE "mailbox_threads" ADD COLUMN "unsnoozed_at" timestamp with time zone DEFAULT null;--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_snoozed_until" ON "mailbox_threads" USING btree ("mailbox_id","snoozed_until");--> statement-breakpoint
CREATE INDEX "ix_mbth_mailbox_unsnoozed_at" ON "mailbox_threads" USING btree ("mailbox_id","unsnoozed_at");

CREATE INDEX "ix_mbth_identity_slug_effective_activity" ON "mailbox_threads" USING btree ("identity_public_id","mailbox_slug",COALESCE("unsnoozed_at", "last_activity_at"),"last_activity_at","thread_id");
