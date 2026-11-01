CREATE TYPE "public"."microsoft_account_status" AS ENUM('connected', 'revoked', 'error');--> statement-breakpoint
CREATE TABLE "microsoft_accounts" (
                                      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                      "workspace_id" uuid DEFAULT
                                                                nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                      "owner_id" uuid DEFAULT
                                                                nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                      "identity_id" uuid DEFAULT null,
                                      "microsoft_user_id" text NOT NULL,
                                      "tenant_id" text NOT NULL,
                                      "email" text NOT NULL,
                                      "name" text DEFAULT null,
                                      "access_token_secret_id" uuid DEFAULT null,
                                      "refresh_token_secret_id" uuid DEFAULT null,
                                      "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
                                      "expires_at" timestamp with time zone DEFAULT null,
                                      "status" "microsoft_account_status" DEFAULT 'connected' NOT NULL,
                                      "last_synced_at" timestamp with time zone DEFAULT null,
                                      "last_error" text DEFAULT null,
                                      "meta" jsonb DEFAULT null,
                                      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "microsoft_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "microsoft_accounts" ADD CONSTRAINT "microsoft_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_accounts" ADD CONSTRAINT "microsoft_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_accounts" ADD CONSTRAINT "microsoft_accounts_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_accounts" ADD CONSTRAINT "microsoft_accounts_access_token_secret_id_secrets_meta_id_fk" FOREIGN KEY ("access_token_secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsoft_accounts" ADD CONSTRAINT "microsoft_accounts_refresh_token_secret_id_secrets_meta_id_fk" FOREIGN KEY ("refresh_token_secret_id") REFERENCES "public"."secrets_meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_microsoft_accounts_workspace_tenant_user" ON "microsoft_accounts" USING btree ("workspace_id","tenant_id","microsoft_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_microsoft_accounts_workspace_email" ON "microsoft_accounts" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "ix_microsoft_accounts_workspace" ON "microsoft_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ix_microsoft_accounts_owner" ON "microsoft_accounts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_microsoft_accounts_identity" ON "microsoft_accounts" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_microsoft_accounts_status" ON "microsoft_accounts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE POLICY "microsoft_accounts_select_workspace" ON "microsoft_accounts" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("microsoft_accounts"."workspace_id" =
                                                                                                  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                  );--> statement-breakpoint
CREATE POLICY "microsoft_accounts_insert_workspace" ON "microsoft_accounts" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("microsoft_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "microsoft_accounts_update_workspace" ON "microsoft_accounts" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("microsoft_accounts"."workspace_id" =
                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                         ) WITH CHECK ("microsoft_accounts"."workspace_id" =
                                                                                                         nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                         );--> statement-breakpoint
CREATE POLICY "microsoft_accounts_delete_workspace" ON "microsoft_accounts" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("microsoft_accounts"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);


CREATE TABLE "storage_deletions" (
                                     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                     "bucket_id" text,
                                     "path" text NOT NULL,
                                     "attempts" integer DEFAULT 0 NOT NULL,
                                     "last_error" text,
                                     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
                                     "processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_storage_deletions_bucket_path" ON "storage_deletions" USING btree ("bucket_id","path") WHERE "storage_deletions"."bucket_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_storage_deletions_null_bucket_path" ON "storage_deletions" USING btree ("path") WHERE "storage_deletions"."bucket_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_storage_deletions_pending" ON "storage_deletions" USING btree ("processed_at");--> statement-breakpoint




CREATE OR REPLACE FUNCTION public.queue_storage_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'messages' THEN
        IF OLD.raw_storage_key IS NOT NULL THEN
            INSERT INTO public.storage_deletions (bucket_id, path)
            VALUES (NULL, OLD.raw_storage_key)
            ON CONFLICT DO NOTHING;
END IF;

    ELSIF TG_TABLE_NAME = 'message_attachments' THEN
        IF OLD.bucket_id IS NOT NULL AND OLD.path IS NOT NULL THEN
            INSERT INTO public.storage_deletions (bucket_id, path)
            VALUES (OLD.bucket_id, OLD.path)
            ON CONFLICT DO NOTHING;
END IF;
END IF;

RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_storage_deletion
ON public.messages;

CREATE TRIGGER trg_messages_storage_deletion
    AFTER DELETE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_storage_deletion();

DROP TRIGGER IF EXISTS trg_attachments_storage_deletion
ON public.message_attachments;

CREATE TRIGGER trg_attachments_storage_deletion
    AFTER DELETE ON public.message_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_storage_deletion();
