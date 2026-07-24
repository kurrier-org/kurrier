CREATE TYPE "public"."google_account_status" AS ENUM('connected', 'revoked', 'error');--> statement-breakpoint
ALTER TYPE "public"."provider_kind" ADD VALUE 'google' BEFORE 'ses';--> statement-breakpoint
CREATE TABLE "google_accounts" (
                                   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                   "workspace_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                   "owner_id" uuid DEFAULT
                                                             nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                   "identity_id" uuid DEFAULT null,
                                   "google_sub" text NOT NULL,
                                   "email" text NOT NULL,
                                   "name" text DEFAULT null,
                                   "picture_url" text DEFAULT null,
                                   "access_token_secret_id" uuid DEFAULT null,
                                   "refresh_token_secret_id" uuid DEFAULT null,
                                   "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
                                   "expires_at" timestamp with time zone DEFAULT null,
                                   "status" "google_account_status" DEFAULT 'connected' NOT NULL,
                                   "last_synced_at" timestamp with time zone DEFAULT null,
                                   "last_error" text DEFAULT null,
                                   "meta" jsonb DEFAULT null,
                                   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                   "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_access_token_secret_id_secrets_meta_id_fk" FOREIGN KEY ("access_token_secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_refresh_token_secret_id_secrets_meta_id_fk" FOREIGN KEY ("refresh_token_secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_google_accounts_workspace_sub" ON "google_accounts" USING btree ("workspace_id","google_sub");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_google_accounts_workspace_email" ON "google_accounts" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "ix_google_accounts_workspace" ON "google_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_google_accounts_owner" ON "google_accounts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_google_accounts_identity" ON "google_accounts" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_google_accounts_status" ON "google_accounts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE POLICY "google_accounts_select_workspace" ON "google_accounts" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("google_accounts"."workspace_id" =
                                                                                            nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                            );--> statement-breakpoint
CREATE POLICY "google_accounts_insert_workspace" ON "google_accounts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("google_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "google_accounts_update_workspace" ON "google_accounts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("google_accounts"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   ) WITH CHECK ("google_accounts"."workspace_id" =
                                                                                                   nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                   );--> statement-breakpoint
CREATE POLICY "google_accounts_delete_workspace" ON "google_accounts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("google_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);
