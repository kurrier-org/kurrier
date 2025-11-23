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


CREATE TYPE "public"."label_scope" AS ENUM('thread', 'contact', 'all');--> statement-breakpoint
CREATE TABLE "contact_labels" (
                                  "contact_id" uuid NOT NULL,
                                  "label_id" uuid NOT NULL,
                                  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                  CONSTRAINT "pk_contact_labels" PRIMARY KEY("contact_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "contact_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "uniq_label_owner_slug";--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "scope" "label_scope" DEFAULT 'thread' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_labels" ADD CONSTRAINT "contact_labels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_contact_labels_label" ON "contact_labels" USING btree ("label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_label_owner_scope_slug" ON "labels" USING btree ("owner_id","scope","slug");--> statement-breakpoint
CREATE POLICY "contact_labels_select_own" ON "contact_labels" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("contact_labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "contact_labels_insert_own" ON "contact_labels" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("contact_labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "contact_labels_delete_own" ON "contact_labels" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("contact_labels"."owner_id" = (select auth.uid()));


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


CREATE TABLE "address_books" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                 "dav_account_id" uuid NOT NULL,
                                 "name" text NOT NULL,
                                 "slug" text NOT NULL,
                                 "remote_path" text NOT NULL,
                                 "is_default" boolean DEFAULT true NOT NULL,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "address_books" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dav_accounts" (
                                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                "owner_id" uuid DEFAULT auth.uid() NOT NULL,
                                "username" text NOT NULL,
                                "secret_id" uuid NOT NULL,
                                "base_path" text DEFAULT '/' NOT NULL,
                                "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dav_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "address_book_id" uuid;--> statement-breakpoint
ALTER TABLE "address_books" ADD CONSTRAINT "address_books_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address_books" ADD CONSTRAINT "address_books_dav_account_id_dav_accounts_id_fk" FOREIGN KEY ("dav_account_id") REFERENCES "public"."dav_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dav_accounts" ADD CONSTRAINT "dav_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dav_accounts" ADD CONSTRAINT "dav_accounts_secret_id_secrets_meta_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_address_books_owner_slug" ON "address_books" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "ix_address_books_owner" ON "address_books" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_address_books_dav_account" ON "address_books" USING btree ("dav_account_id");--> statement-breakpoint
CREATE INDEX "ix_address_books_default" ON "address_books" USING btree ("owner_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_dav_accounts_owner_username" ON "dav_accounts" USING btree ("owner_id","username");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_address_book_id_address_books_id_fk" FOREIGN KEY ("address_book_id") REFERENCES "public"."address_books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "address_books_select_own" ON "address_books" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("address_books"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "address_books_insert_own" ON "address_books" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("address_books"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "address_books_update_own" ON "address_books" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("address_books"."owner_id" = (select auth.uid())) WITH CHECK ("address_books"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "address_books_delete_own" ON "address_books" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("address_books"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dav_accounts_select_own" ON "dav_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("dav_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dav_accounts_insert_own" ON "dav_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("dav_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dav_accounts_update_own" ON "dav_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("dav_accounts"."owner_id" = (select auth.uid())) WITH CHECK ("dav_accounts"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dav_accounts_delete_own" ON "dav_accounts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("dav_accounts"."owner_id" = (select auth.uid()));



ALTER TABLE "contacts" ADD COLUMN "dav_addressbook_id" integer;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "dav_etag" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "dav_uri" text;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_contacts_owner_dav_uri" ON "contacts" USING btree ("owner_id","dav_uri") WHERE "contacts"."dav_uri" IS NOT NULL;


ALTER TABLE "address_books" ADD COLUMN "dav_sync_token" text NOT NULL;

ALTER TABLE "address_books" ALTER COLUMN "dav_sync_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "dav_addressbook_id";
