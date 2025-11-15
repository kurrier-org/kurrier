CREATE TYPE "public"."webhook_list" AS ENUM('message.received');--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"identity_id" uuid DEFAULT null,
	"url" text NOT NULL,
	"description" text,
	"events" "webhook_list"[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_webhooks_owner" ON "webhooks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_webhooks_identity" ON "webhooks" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_webhooks_enabled" ON "webhooks" USING btree ("enabled");--> statement-breakpoint
CREATE POLICY "webhooks_select_own" ON "webhooks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("webhooks"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhooks_insert_own" ON "webhooks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("webhooks"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhooks_update_own" ON "webhooks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("webhooks"."owner_id" = (select auth.uid())) WITH CHECK ("webhooks"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhooks_delete_own" ON "webhooks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("webhooks"."owner_id" = (select auth.uid()));