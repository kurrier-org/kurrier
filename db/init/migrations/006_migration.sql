CREATE TYPE "public"."secret_managed_by" AS ENUM('system', 'user');--> statement-breakpoint
ALTER TABLE "secrets_meta" ADD COLUMN "managed_by" "secret_managed_by" DEFAULT 'system' NOT NULL;
CREATE INDEX "ix_secrets_meta_managed_by" ON "secrets_meta" USING btree ("workspace_id","managed_by");
