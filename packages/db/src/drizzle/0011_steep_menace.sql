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