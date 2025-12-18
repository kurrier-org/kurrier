ALTER TABLE "draft_messages"
    ADD COLUMN "identity_id" uuid DEFAULT null;--> statement-breakpoint

ALTER TABLE "draft_messages"
    ADD CONSTRAINT "draft_messages_identity_id_identities_id_fk"
        FOREIGN KEY ("identity_id")
            REFERENCES "public"."identities"("id")
            ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "ix_draft_messages_identity"
    ON "draft_messages" USING btree ("identity_id");--> statement-breakpoint
