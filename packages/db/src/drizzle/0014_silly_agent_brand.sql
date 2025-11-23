ALTER TABLE "contacts" ADD COLUMN "dav_addressbook_id" integer;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "dav_etag" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "dav_uri" text;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_contacts_owner_dav_uri" ON "contacts" USING btree ("owner_id","dav_uri") WHERE "contacts"."dav_uri" IS NOT NULL;