CREATE TABLE "contacts" (
                            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                            "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                            "public_id" text NOT NULL,
                            "profile_picture" text,
                            "first_name" text NOT NULL,
                            "last_name" text,
                            "company" text,
                            "job_title" text,
                            "department" text,
                            "emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
                            "phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
                            "addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
                            "dob" text,
                            "notes" text,
                            "meta" jsonb DEFAULT 'null'::jsonb,
                            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                            "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_contacts_owner_public_id" ON "contacts" USING btree ("owner_id","public_id");--> statement-breakpoint
CREATE INDEX "ix_contacts_owner" ON "contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_contacts_name" ON "contacts" USING btree ("owner_id","last_name","first_name");--> statement-breakpoint
CREATE POLICY "contacts_select_own" ON "contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("contacts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "contacts_insert_own" ON "contacts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("contacts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "contacts_update_own" ON "contacts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("contacts"."owner_id" = (select auth.uid())) WITH CHECK ("contacts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "contacts_delete_own" ON "contacts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("contacts"."owner_id" = (select auth.uid()));
ALTER TABLE "contacts" ADD COLUMN "profile_picture_xs" text;
