CREATE TABLE "email_assets" (
                                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                "public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
                                "workspace_id" uuid DEFAULT
                                                          nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                "owner_id" uuid DEFAULT
                                                          nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    ,
                                "bucket_id" text NOT NULL,
                                "path" text NOT NULL,
                                "filename_original" text DEFAULT null,
                                "content_type" text NOT NULL,
                                "size_bytes" integer NOT NULL,
                                "revoked_at" timestamp with time zone DEFAULT null,
                                "meta" jsonb DEFAULT null,
                                "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_assets" ADD CONSTRAINT "email_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_assets" ADD CONSTRAINT "email_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_assets_public_id" ON "email_assets" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_assets_bucket_path" ON "email_assets" USING btree ("bucket_id","path");--> statement-breakpoint
CREATE INDEX "ix_email_assets_workspace" ON "email_assets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_email_assets_owner" ON "email_assets" USING btree ("owner_id");--> statement-breakpoint
CREATE POLICY "email_assets_select_workspace" ON "email_assets" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("email_assets"."workspace_id" =
                                                                                      nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                      );--> statement-breakpoint
CREATE POLICY "email_assets_insert_workspace" ON "email_assets" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("email_assets"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "email_assets_update_workspace" ON "email_assets" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("email_assets"."workspace_id" =
                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                             ) WITH CHECK ("email_assets"."workspace_id" =
                                                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                             );--> statement-breakpoint
CREATE POLICY "email_assets_delete_workspace" ON "email_assets" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("email_assets"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);

CREATE TABLE "email_templates" (
                                   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                   "public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
                                   "workspace_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                   "owner_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    ,
                                   "name" text NOT NULL,
                                   "subject" text DEFAULT '' NOT NULL,
                                   "preview_text" text DEFAULT '' NOT NULL,
                                   "document" jsonb NOT NULL,
                                   "meta" jsonb DEFAULT null,
                                   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                   "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_templates_public_id" ON "email_templates" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "ix_email_templates_workspace" ON "email_templates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_email_templates_owner" ON "email_templates" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_email_templates_workspace_updated" ON "email_templates" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE POLICY "email_templates_select_workspace" ON "email_templates" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("email_templates"."workspace_id" =
                                                                                            nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                            );--> statement-breakpoint
CREATE POLICY "email_templates_insert_workspace" ON "email_templates" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("email_templates"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "email_templates_update_workspace" ON "email_templates" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("email_templates"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   ) WITH CHECK ("email_templates"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   );--> statement-breakpoint
CREATE POLICY "email_templates_delete_workspace" ON "email_templates" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("email_templates"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);

CREATE TABLE "email_signatures" (
                                    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                    "public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
                                    "workspace_id" uuid DEFAULT
                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                    "owner_id" uuid DEFAULT
                                                              nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    ,
                                    "identity_id" uuid NOT NULL,
                                    "name" text NOT NULL,
                                    "document" jsonb NOT NULL,
                                    "is_default_for_new" boolean DEFAULT false NOT NULL,
                                    "is_default_for_reply_forward" boolean DEFAULT false NOT NULL,
                                    "meta" jsonb DEFAULT null,
                                    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_signatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_signatures_public_id" ON "email_signatures" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_signatures_identity_name" ON "email_signatures" USING btree ("identity_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_signatures_default_new" ON "email_signatures" USING btree ("identity_id") WHERE "email_signatures"."is_default_for_new" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_email_signatures_default_reply_forward" ON "email_signatures" USING btree ("identity_id") WHERE "email_signatures"."is_default_for_reply_forward" = true;--> statement-breakpoint
CREATE INDEX "ix_email_signatures_workspace" ON "email_signatures" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_email_signatures_owner" ON "email_signatures" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_email_signatures_identity" ON "email_signatures" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_email_signatures_identity_updated" ON "email_signatures" USING btree ("identity_id","updated_at");--> statement-breakpoint
CREATE POLICY "email_signatures_select_workspace" ON "email_signatures" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("email_signatures"."workspace_id" =
                                                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                              );--> statement-breakpoint
CREATE POLICY "email_signatures_insert_workspace" ON "email_signatures" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("email_signatures"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "email_signatures_update_workspace" ON "email_signatures" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("email_signatures"."workspace_id" =
                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                     ) WITH CHECK ("email_signatures"."workspace_id" =
                                                                                                     nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                     );--> statement-breakpoint
CREATE POLICY "email_signatures_delete_workspace" ON "email_signatures" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("email_signatures"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);
