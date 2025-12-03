CREATE TYPE "public"."calendar_busy_status" AS ENUM('busy', 'free', 'tentative', 'out_of_office');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TABLE "calendar_events" (
                                   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                   "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                   "calendar_id" uuid NOT NULL,
                                   "title" text NOT NULL,
                                   "description" text,
                                   "location" text,
                                   "is_all_day" boolean DEFAULT false NOT NULL,
                                   "starts_at" timestamp with time zone NOT NULL,
                                   "ends_at" timestamp with time zone NOT NULL,
                                   "status" "calendar_event_status" DEFAULT 'confirmed' NOT NULL,
                                   "busy_status" "calendar_busy_status" DEFAULT 'busy' NOT NULL,
                                   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                   "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendars" (
                             "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                             "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                             "dav_account_id" uuid NOT NULL,
                             "dav_sync_token" text,
                             "dav_calendar_id" integer,
                             "remote_path" text NOT NULL,
                             "name" text NOT NULL,
                             "slug" text NOT NULL,
                             "color" text,
                             "timezone" text DEFAULT 'UTC' NOT NULL,
                             "is_default" boolean DEFAULT false NOT NULL,
                             "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                             "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_dav_account_id_dav_accounts_id_fk" FOREIGN KEY ("dav_account_id") REFERENCES "public"."dav_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_calendar_events_owner" ON "calendar_events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_calendar_events_calendar" ON "calendar_events" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "ix_calendar_events_calendar_start" ON "calendar_events" USING btree ("calendar_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_calendars_owner_slug" ON "calendars" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "ix_calendars_owner" ON "calendars" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_calendars_dav_account" ON "calendars" USING btree ("dav_account_id");--> statement-breakpoint
CREATE INDEX "ix_calendars_default" ON "calendars" USING btree ("owner_id","is_default");--> statement-breakpoint
CREATE POLICY "calendar_events_select_own" ON "calendar_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("calendar_events"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendar_events_insert_own" ON "calendar_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("calendar_events"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendar_events_update_own" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("calendar_events"."owner_id" = (select auth.uid())) WITH CHECK ("calendar_events"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendar_events_delete_own" ON "calendar_events" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("calendar_events"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendars_select_own" ON "calendars" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("calendars"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendars_insert_own" ON "calendars" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("calendars"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendars_update_own" ON "calendars" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("calendars"."owner_id" = (select auth.uid())) WITH CHECK ("calendars"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendars_delete_own" ON "calendars" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("calendars"."owner_id" = (select auth.uid()));

ALTER TABLE "calendars" ADD COLUMN "public_id" text NOT NULL;
