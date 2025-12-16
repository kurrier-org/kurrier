DROP INDEX "ix_drive_volumes_default";--> statement-breakpoint
ALTER TABLE "drive_volumes" ALTER COLUMN "base_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "drive_entries" ADD COLUMN "trashed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drive_volumes" ADD COLUMN "provider_id" uuid;--> statement-breakpoint
ALTER TABLE "drive_volumes" ADD CONSTRAINT "drive_volumes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_volumes_public_id" ON "drive_volumes" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "ix_drive_volumes_provider" ON "drive_volumes" USING btree ("provider_id");--> statement-breakpoint
ALTER TABLE "drive_volumes" DROP COLUMN "cloud_config";