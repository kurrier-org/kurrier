CREATE TYPE "public"."jmap_preset" AS ENUM('fastmail');--> statement-breakpoint
ALTER TYPE "public"."provider_kind" ADD VALUE 'jmap';--> statement-breakpoint
CREATE TABLE "jmap_accounts" (
                                 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                 "workspace_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                 "owner_id" uuid DEFAULT
                                                           nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                 "provider_id" uuid NOT NULL,
                                 "identity_id" uuid DEFAULT null,
                                 "account_id" text NOT NULL,
                                 "username" text NOT NULL,
                                 "session_url" text NOT NULL,
                                 "preset" "jmap_preset",
                                 "sync_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
                                 "token_secret_id" uuid NOT NULL,
                                 "meta" jsonb DEFAULT null,
                                 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jmap_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jmap_accounts" ADD CONSTRAINT "jmap_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jmap_accounts" ADD CONSTRAINT "jmap_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jmap_accounts" ADD CONSTRAINT "jmap_accounts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jmap_accounts" ADD CONSTRAINT "jmap_accounts_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jmap_accounts" ADD CONSTRAINT "jmap_accounts_token_secret_id_secrets_meta_id_fk" FOREIGN KEY ("token_secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_jmap_accounts_provider_account" ON "jmap_accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_jmap_accounts_identity" ON "jmap_accounts" USING btree ("identity_id") WHERE "jmap_accounts"."identity_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_jmap_accounts_workspace" ON "jmap_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_jmap_accounts_owner" ON "jmap_accounts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_jmap_accounts_provider" ON "jmap_accounts" USING btree ("provider_id");--> statement-breakpoint
CREATE POLICY "jmap_accounts_select" ON "jmap_accounts" AS PERMISSIVE FOR SELECT TO "kurrier" USING (
                                                                              "jmap_accounts"."workspace_id" =
                                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                              AND EXISTS (
                                                                              SELECT 1
                                                                              FROM identities i
                                                                              WHERE
                                                                              i.id = "jmap_accounts"."identity_id"
                                                                              AND i.workspace_id =
                                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                              AND (
                                                                              i.shared_with_workspace = true
                                                                              OR EXISTS (
                                                                              SELECT 1
                                                                              FROM workspace_identity_members wim
                                                                              WHERE
                                                                              wim.workspace_id =
                                                                              nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid

                                                                              AND wim.user_id =
                                                                              nullif(current_setting('request.jwt.claim.sub', true), '')::uuid

                                                                              AND wim.identity_id = i.id
                                                                              )
                                                                              )
                                                                              )
                                                                              );--> statement-breakpoint
CREATE POLICY "jmap_accounts_insert_workspace" ON "jmap_accounts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("jmap_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "jmap_accounts_update_workspace" ON "jmap_accounts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("jmap_accounts"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               ) WITH CHECK ("jmap_accounts"."workspace_id" =
                                                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                               );--> statement-breakpoint
CREATE POLICY "jmap_accounts_delete_workspace" ON "jmap_accounts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("jmap_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);
