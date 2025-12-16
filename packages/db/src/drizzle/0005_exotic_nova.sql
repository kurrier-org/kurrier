DROP INDEX "ix_drive_entries_trashed";--> statement-breakpoint
ALTER TABLE "drive_entries" DROP COLUMN "is_trashed";--> statement-breakpoint
ALTER TABLE "drive_entries" DROP COLUMN "trashed_at";--> statement-breakpoint
ALTER TABLE "drive_entries" DROP COLUMN "etag";--> statement-breakpoint
ALTER TABLE "drive_entries" DROP COLUMN "checksum";--> statement-breakpoint
ALTER TABLE "drive_volumes" DROP COLUMN "is_default";--> statement-breakpoint
ALTER TABLE "drive_volumes" DROP COLUMN "is_available";