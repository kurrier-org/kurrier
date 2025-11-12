CREATE TYPE "public"."api_scope" AS ENUM('emails:send', 'templates:read', 'templates:write');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"name" text NOT NULL,
	"secret_id" uuid NOT NULL,
	"key_prefix" text NOT NULL,
	"key_last4" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"scopes" "api_scope"[] NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_api_keys_owner_name" ON "api_keys" USING btree ("owner_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_api_keys_owner_prefix" ON "api_keys" USING btree ("owner_id","key_prefix");--> statement-breakpoint
CREATE INDEX "ix_api_keys_owner" ON "api_keys" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_api_keys_expires" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ix_api_keys_revoked" ON "api_keys" USING btree ("revoked_at");--> statement-breakpoint
CREATE POLICY "apikeys_select_own" ON "api_keys" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("api_keys"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "apikeys_insert_own" ON "api_keys" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("api_keys"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "apikeys_update_own" ON "api_keys" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("api_keys"."owner_id" = (select auth.uid())) WITH CHECK ("api_keys"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "apikeys_delete_own" ON "api_keys" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("api_keys"."owner_id" = (select auth.uid()));