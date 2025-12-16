CREATE TYPE "public"."drive_upload_intent_scope" AS ENUM('home', 'cloud');--> statement-breakpoint
CREATE TABLE "drive_upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"volume_id" uuid NOT NULL,
	"scope" "drive_upload_intent_scope" DEFAULT 'home' NOT NULL,
	"token" text NOT NULL,
	"target_path" text NOT NULL,
	"single_use" boolean DEFAULT true NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ADD CONSTRAINT "drive_upload_intents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_upload_intents" ADD CONSTRAINT "drive_upload_intents_volume_id_drive_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "public"."drive_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_upload_intents_token" ON "drive_upload_intents" USING btree ("token");--> statement-breakpoint
CREATE INDEX "ix_drive_upload_intents_owner" ON "drive_upload_intents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_drive_upload_intents_volume" ON "drive_upload_intents" USING btree ("volume_id");--> statement-breakpoint
CREATE INDEX "ix_drive_upload_intents_expires" ON "drive_upload_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE POLICY "drive_upload_intents_select_own" ON "drive_upload_intents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("drive_upload_intents"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_upload_intents_insert_own" ON "drive_upload_intents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("drive_upload_intents"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_upload_intents_update_own" ON "drive_upload_intents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("drive_upload_intents"."owner_id" = (select auth.uid())) WITH CHECK ("drive_upload_intents"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_upload_intents_delete_own" ON "drive_upload_intents" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("drive_upload_intents"."owner_id" = (select auth.uid()));