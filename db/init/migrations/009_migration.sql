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

ALTER TABLE "calendar_events" ADD COLUMN "dav_etag" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "dav_uri" text;
ALTER TABLE "calendar_events" ADD COLUMN "raw_ics" text;
CREATE UNIQUE INDEX "ix_calendar_events_owner_dav_uri" ON "calendar_events" USING btree ("owner_id","dav_uri") WHERE "calendar_events"."dav_uri" IS NOT NULL;
ALTER TABLE "identities" ADD COLUMN "display_name" text;

ALTER TABLE "calendar_events" ADD COLUMN "organizer_identity_id" uuid;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "organizer_email" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "organizer_name" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizer_identity_id_identities_id_fk" FOREIGN KEY ("organizer_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;




CREATE TYPE "public"."calendar_attendee_partstat" AS ENUM('needs_action', 'accepted', 'declined', 'tentative', 'delegated', 'in_process', 'completed');--> statement-breakpoint
CREATE TYPE "public"."calendar_attendee_role" AS ENUM('req_participant', 'opt_participant', 'non_participant', 'chair');--> statement-breakpoint
CREATE TABLE "calendar_event_attendees" (
                                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                            "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                            "event_id" uuid NOT NULL,
                                            "email" text NOT NULL,
                                            "name" text,
                                            "role" "calendar_attendee_role" DEFAULT 'req_participant' NOT NULL,
                                            "partstat" "calendar_attendee_partstat" DEFAULT 'needs_action' NOT NULL,
                                            "rsvp" boolean DEFAULT false NOT NULL,
                                            "is_organizer" boolean DEFAULT false NOT NULL,
                                            "meta" jsonb DEFAULT 'null'::jsonb,
                                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_event_attendees_owner" ON "calendar_event_attendees" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_event_attendees_event" ON "calendar_event_attendees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ix_event_attendees_email" ON "calendar_event_attendees" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_event_attendees_event_email" ON "calendar_event_attendees" USING btree ("event_id","email");--> statement-breakpoint
CREATE POLICY "event_attendees_select_own" ON "calendar_event_attendees" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("calendar_event_attendees"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "event_attendees_insert_own" ON "calendar_event_attendees" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("calendar_event_attendees"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "event_attendees_update_own" ON "calendar_event_attendees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("calendar_event_attendees"."owner_id" = (select auth.uid())) WITH CHECK ("calendar_event_attendees"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "event_attendees_delete_own" ON "calendar_event_attendees" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("calendar_event_attendees"."owner_id" = (select auth.uid()));


ALTER TABLE "calendar_event_attendees" ADD COLUMN "contact_id" uuid DEFAULT null;--> statement-breakpoint
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "calendar_events" ADD COLUMN "is_external" boolean DEFAULT false NOT NULL;
