ALTER TABLE "workspaces" ADD COLUMN "theme" text DEFAULT 'indigo' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "custom_color" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "logo_key" text;
