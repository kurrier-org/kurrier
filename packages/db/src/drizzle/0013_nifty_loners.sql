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