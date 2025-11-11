ALTER TABLE "mailboxes" ADD COLUMN "parent_id" uuid DEFAULT null;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_parent_id_mailboxes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mailbox_parent" ON "mailboxes" USING btree ("parent_id");
