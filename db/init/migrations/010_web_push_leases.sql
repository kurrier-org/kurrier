ALTER TABLE "web_push_deliveries" ADD COLUMN IF NOT EXISTS "lease_token" text;--> statement-breakpoint
UPDATE "web_push_deliveries" SET "lease_until" = now() - interval '1 second' WHERE "status" = 'sending' AND "lease_until" IS NULL;--> statement-breakpoint
