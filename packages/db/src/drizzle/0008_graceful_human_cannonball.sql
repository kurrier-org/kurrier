ALTER TABLE "threads" DROP CONSTRAINT "threads_mailbox_id_mailboxes_id_fk";
--> statement-breakpoint
DROP INDEX "idx_threads_mailbox_lastdate";--> statement-breakpoint
DROP INDEX "idx_threads_mailbox_updated";--> statement-breakpoint
CREATE INDEX "idx_threads_owner_lastdate" ON "threads" USING btree ("owner_id","last_message_date","id");--> statement-breakpoint
CREATE INDEX "idx_threads_owner_id" ON "threads" USING btree ("owner_id","id");--> statement-breakpoint
ALTER TABLE "threads" DROP COLUMN "mailbox_id";