CREATE TABLE "app_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"version" text NOT NULL,
	"scope" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_migrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_migrations" ADD CONSTRAINT "app_migrations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_migrations_owner_version" ON "app_migrations" USING btree ("owner_id","version");--> statement-breakpoint
CREATE POLICY "app_migrations_select_own" ON "app_migrations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("app_migrations"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "app_migrations_insert_own" ON "app_migrations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("app_migrations"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "app_migrations_update_own" ON "app_migrations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("app_migrations"."owner_id" = (select auth.uid())) WITH CHECK ("app_migrations"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "app_migrations_delete_own" ON "app_migrations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("app_migrations"."owner_id" = (select auth.uid()));