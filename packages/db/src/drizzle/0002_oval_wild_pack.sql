ALTER TABLE "threads_list" RENAME COLUMN "mailbox_public_id" TO "identity_public_id";--> statement-breakpoint
DROP INDEX "ix_threads_list_mailbox_public_id";--> statement-breakpoint
CREATE INDEX "ix_threads_list_identity_public_id" ON "threads_list" USING btree ("identity_public_id");