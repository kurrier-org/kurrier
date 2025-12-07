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