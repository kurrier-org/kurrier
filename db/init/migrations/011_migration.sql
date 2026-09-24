CREATE TABLE "drive_share_links" (
                                     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                                     "owner_id" uuid DEFAULT
                                                               nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 NOT NULL,
                                     "workspace_id" uuid DEFAULT
                                                               nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
 NOT NULL,
                                     "entry_id" uuid NOT NULL,
                                     "token_hash" text NOT NULL,
                                     "expires_at" timestamp with time zone NOT NULL,
                                     "revoked_at" timestamp with time zone,
                                     "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_share_links" ADD CONSTRAINT "drive_share_links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_share_links" ADD CONSTRAINT "drive_share_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_share_links" ADD CONSTRAINT "drive_share_links_entry_id_drive_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."drive_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_share_links_token_hash" ON "drive_share_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ix_drive_share_links_entry" ON "drive_share_links" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "ix_drive_share_links_expires" ON "drive_share_links" USING btree ("expires_at");--> statement-breakpoint
CREATE POLICY "drive_share_links_select_workspace" ON "drive_share_links" AS PERMISSIVE FOR SELECT TO "kurrier" USING ("drive_share_links"."workspace_id" =
                                                                                                nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                );--> statement-breakpoint
CREATE POLICY "drive_share_links_insert_workspace" ON "drive_share_links" AS PERMISSIVE FOR INSERT TO "kurrier" WITH CHECK ("drive_share_links"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);--> statement-breakpoint
CREATE POLICY "drive_share_links_update_workspace" ON "drive_share_links" AS PERMISSIVE FOR UPDATE TO "kurrier" USING ("drive_share_links"."workspace_id" =
                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                       ) WITH CHECK ("drive_share_links"."workspace_id" =
                                                                                                       nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
                                                                                                       );--> statement-breakpoint
CREATE POLICY "drive_share_links_delete_workspace" ON "drive_share_links" AS PERMISSIVE FOR DELETE TO "kurrier" USING ("drive_share_links"."workspace_id" =
  nullif(current_setting('request.jwt.claim.workspace_id', true), '')::uuid
);
