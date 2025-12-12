CREATE TYPE "public"."drive_entry_type" AS ENUM('file', 'folder');--> statement-breakpoint
CREATE TYPE "public"."drive_volume_kind" AS ENUM('local', 'cloud');--> statement-breakpoint
CREATE TABLE "drive_entries" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                 "volume_id" uuid NOT NULL,
                                 "type" "drive_entry_type" DEFAULT 'file' NOT NULL,
                                 "path" text NOT NULL,
                                 "name" text NOT NULL,
                                 "size_bytes" bigint DEFAULT 0,
                                 "mime_type" text,
                                 "is_trashed" boolean DEFAULT false NOT NULL,
                                 "etag" text,
                                 "checksum" text,
                                 "last_synced_at" timestamp with time zone,
                                 "meta" jsonb DEFAULT 'null'::jsonb,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "drive_volumes" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                 "public_id" text NOT NULL,
                                 "kind" "drive_volume_kind" DEFAULT 'local' NOT NULL,
                                 "code" text NOT NULL,
                                 "label" text NOT NULL,
                                 "base_path" text NOT NULL,
                                 "is_default" boolean DEFAULT false NOT NULL,
                                 "cloud_config" jsonb DEFAULT 'null'::jsonb,
                                 "meta" jsonb DEFAULT 'null'::jsonb,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_volumes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_entries" ADD CONSTRAINT "drive_entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_entries" ADD CONSTRAINT "drive_entries_volume_id_drive_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "public"."drive_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_volumes" ADD CONSTRAINT "drive_volumes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_entries_owner_volume_path" ON "drive_entries" USING btree ("owner_id","volume_id","path");--> statement-breakpoint
CREATE INDEX "ix_drive_entries_owner" ON "drive_entries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_drive_entries_volume" ON "drive_entries" USING btree ("volume_id");--> statement-breakpoint
CREATE INDEX "ix_drive_entries_trashed" ON "drive_entries" USING btree ("owner_id","is_trashed");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_volumes_owner_code" ON "drive_volumes" USING btree ("owner_id","code");--> statement-breakpoint
CREATE INDEX "ix_drive_volumes_owner" ON "drive_volumes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_drive_volumes_default" ON "drive_volumes" USING btree ("owner_id","is_default");--> statement-breakpoint
CREATE POLICY "drive_entries_select_own" ON "drive_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("drive_entries"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_entries_insert_own" ON "drive_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("drive_entries"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_entries_update_own" ON "drive_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("drive_entries"."owner_id" = (select auth.uid())) WITH CHECK ("drive_entries"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_entries_delete_own" ON "drive_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("drive_entries"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_volumes_select_own" ON "drive_volumes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("drive_volumes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_volumes_insert_own" ON "drive_volumes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("drive_volumes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_volumes_update_own" ON "drive_volumes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("drive_volumes"."owner_id" = (select auth.uid())) WITH CHECK ("drive_volumes"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "drive_volumes_delete_own" ON "drive_volumes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("drive_volumes"."owner_id" = (select auth.uid()));

ALTER TABLE "drive_volumes" ADD COLUMN "is_available" boolean DEFAULT false NOT NULL;
