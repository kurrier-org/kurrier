CREATE INDEX "ix_calendar_events_organizer_identity" ON "calendar_events" USING btree ("organizer_identity_id");--> statement-breakpoint
CREATE INDEX "ix_calendars_identity" ON "calendars" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_calendars_workspace_identity" ON "calendars" USING btree ("workspace_id","identity_id");--> statement-breakpoint
CREATE INDEX "ix_identities_domain_identity" ON "identities" USING btree ("domain_identity_id");--> statement-breakpoint
CREATE INDEX "ix_identities_provider" ON "identities" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ix_identities_smtp_account" ON "identities" USING btree ("smtp_account_id");--> statement-breakpoint
CREATE INDEX "ix_labels_identity" ON "labels" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_labels_workspace_identity" ON "labels" USING btree ("workspace_id","identity_id");--> statement-breakpoint
CREATE INDEX "ix_mail_rules_identity" ON "mail_rules" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_mailbox_threads_identity" ON "mailbox_threads" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "ix_messages_thread" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "ix_workspaces_default_identity" ON "workspaces" USING btree ("default_identity_id");
