CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid DEFAULT null,
	"color_bg" text,
	"color_text" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"meta" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mailbox_thread_labels" (
	"thread_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_mailbox_thread_labels" PRIMARY KEY("thread_id","mailbox_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_parent_id_labels_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_thread_labels" ADD CONSTRAINT "mailbox_thread_labels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_label_owner_slug" ON "labels" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "ix_mbtlabel_mailbox_label" ON "mailbox_thread_labels" USING btree ("mailbox_id","label_id");--> statement-breakpoint
CREATE INDEX "ix_mbtlabel_label" ON "mailbox_thread_labels" USING btree ("label_id");--> statement-breakpoint
CREATE POLICY "labels_select_own" ON "labels" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "labels_insert_own" ON "labels" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "labels_update_own" ON "labels" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("labels"."owner_id" = (select auth.uid())) WITH CHECK ("labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "labels_delete_own" ON "labels" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbtlabel_select_own" ON "mailbox_thread_labels" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mailbox_thread_labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbtlabel_insert_own" ON "mailbox_thread_labels" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mailbox_thread_labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbtlabel_update_own" ON "mailbox_thread_labels" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mailbox_thread_labels"."owner_id" = (select auth.uid())) WITH CHECK ("mailbox_thread_labels"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mbtlabel_delete_own" ON "mailbox_thread_labels" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mailbox_thread_labels"."owner_id" = (select auth.uid()));