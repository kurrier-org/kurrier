ALTER TABLE "calendar_events" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "recurrence_exdates" timestamp with time zone[] DEFAULT '{}'::timestamptz[] NOT NULL;
