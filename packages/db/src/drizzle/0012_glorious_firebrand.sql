CREATE TYPE "public"."mail_subscription_status" AS ENUM('subscribed', 'unsubscribed', 'pending', 'failed');--> statement-breakpoint
CREATE TABLE "mail_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"subscription_key" text NOT NULL,
	"list_id" text,
	"unsubscribe_http_url" text,
	"unsubscribe_mailto" text,
	"one_click" boolean DEFAULT false NOT NULL,
	"status" "mail_subscription_status" DEFAULT 'subscribed' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mail_subscriptions" ADD CONSTRAINT "mail_subscriptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mail_subscriptions_owner_key" ON "mail_subscriptions" USING btree ("owner_id","subscription_key");--> statement-breakpoint
CREATE INDEX "idx_mail_subscriptions_status" ON "mail_subscriptions" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "idx_mail_subscriptions_last_seen" ON "mail_subscriptions" USING btree ("owner_id","last_seen_at");--> statement-breakpoint
CREATE POLICY "mail_subscriptions_select_own" ON "mail_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mail_subscriptions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_subscriptions_insert_own" ON "mail_subscriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mail_subscriptions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_subscriptions_update_own" ON "mail_subscriptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mail_subscriptions"."owner_id" = (select auth.uid())) WITH CHECK ("mail_subscriptions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_subscriptions_delete_own" ON "mail_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mail_subscriptions"."owner_id" = (select auth.uid()));