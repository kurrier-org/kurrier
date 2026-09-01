ALTER TABLE "web_push_deliveries" DROP CONSTRAINT IF EXISTS "web_push_deliveries_message_id_messages_id_fk";--> statement-breakpoint
ALTER TABLE "web_push_deliveries" ALTER COLUMN "message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "web_push_deliveries" ADD CONSTRAINT "web_push_deliveries_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "web_push_deliveries" DROP CONSTRAINT IF EXISTS "web_push_deliveries_subscription_id_web_push_subscriptions_id_fk";--> statement-breakpoint
ALTER TABLE "web_push_deliveries" ALTER COLUMN "subscription_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "web_push_deliveries" ADD CONSTRAINT "web_push_deliveries_subscription_id_web_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "web_push_subscriptions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "web_push_deliveries" ADD COLUMN "lease_until" timestamptz;--> statement-breakpoint
