ALTER TABLE "calendar_events" ADD COLUMN "organizer_identity_id" uuid;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "organizer_email" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "organizer_name" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizer_identity_id_identities_id_fk" FOREIGN KEY ("organizer_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;