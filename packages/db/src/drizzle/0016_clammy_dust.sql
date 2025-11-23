ALTER TABLE "address_books" ALTER COLUMN "dav_sync_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "dav_addressbook_id";