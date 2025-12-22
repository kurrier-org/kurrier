CREATE TYPE "public"."mail_rule_action_type" AS ENUM('mark_read', 'mark_unread', 'flag', 'unflag', 'add_label', 'remove_label', 'move_to_mailbox', 'archive', 'trash');--> statement-breakpoint
CREATE TABLE "mail_rule_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"action_type" "mail_rule_action_type" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"params" jsonb DEFAULT null,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"stop_processing" boolean DEFAULT false NOT NULL,
	"match" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ADD CONSTRAINT "mail_rule_actions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rule_actions" ADD CONSTRAINT "mail_rule_actions_rule_id_mail_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."mail_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rules" ADD CONSTRAINT "mail_rules_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_rules" ADD CONSTRAINT "mail_rules_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mail_rule_actions_rule_order" ON "mail_rule_actions" USING btree ("rule_id","order");--> statement-breakpoint
CREATE INDEX "idx_mail_rule_actions_rule" ON "mail_rule_actions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_mail_rules_owner_identity" ON "mail_rules" USING btree ("owner_id","identity_id");--> statement-breakpoint
CREATE INDEX "idx_mail_rules_owner_enabled_priority" ON "mail_rules" USING btree ("owner_id","enabled","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mail_rules_owner_identity_name" ON "mail_rules" USING btree ("owner_id","identity_id","name");--> statement-breakpoint
CREATE POLICY "mail_rule_actions_select_own" ON "mail_rule_actions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mail_rule_actions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rule_actions_insert_own" ON "mail_rule_actions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mail_rule_actions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rule_actions_update_own" ON "mail_rule_actions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mail_rule_actions"."owner_id" = (select auth.uid())) WITH CHECK ("mail_rule_actions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rule_actions_delete_own" ON "mail_rule_actions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mail_rule_actions"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rules_select_own" ON "mail_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("mail_rules"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rules_insert_own" ON "mail_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("mail_rules"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rules_update_own" ON "mail_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("mail_rules"."owner_id" = (select auth.uid())) WITH CHECK ("mail_rules"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "mail_rules_delete_own" ON "mail_rules" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mail_rules"."owner_id" = (select auth.uid()));