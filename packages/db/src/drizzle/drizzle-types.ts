import {
    providers,
    smtpAccounts,
    identities,
    mailboxes,
    messages,
    threads,
    messageAttachments,
    mailboxSync,
    mailboxThreads,
    webhooks,
    labels,
    mailboxThreadLabels,
    contacts,
    addressBooks,
    calendars,
    calendarEvents,
    calendarEventAttendees, driveVolumes, driveEntries, draftMessages,
} from "./schema";
import { decryptedSecrets } from "./supabase-schema";
import { z } from "zod";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";

export type ProviderEntity = typeof providers.$inferSelect;
export type ProviderCreate = typeof providers.$inferInsert;
export type ProviderUpdate = Partial<ProviderCreate>;

export type SMTPAccountEntity = typeof smtpAccounts.$inferSelect;
export type SMTPAccountCreate = typeof smtpAccounts.$inferInsert;
export type SMTPAccountUpdate = Partial<SMTPAccountCreate>;

export type IdentityEntity = typeof identities.$inferSelect;
export type IdentityUpdate = Partial<IdentityCreate>;
export type IdentityCreate = typeof identities.$inferInsert;
export const IdentityInsertSchema = createInsertSchema(identities);
export type IdentityInsert = z.infer<typeof IdentityInsertSchema>;

export type MailboxEntity = typeof mailboxes.$inferSelect;
export type MailboxCreate = typeof mailboxes.$inferInsert;
export const MailboxInsertSchema = createInsertSchema(mailboxes);
export const MailboxUpdateSchema = createUpdateSchema(mailboxes);
export type MailboxUpdate = Partial<MailboxCreate>;

export type MessageEntity = typeof messages.$inferSelect;
export type MessageCreate = typeof messages.$inferInsert;
export const MessageInsertSchema = createInsertSchema(messages);
export type MessageUpdate = Partial<MessageCreate>;

export type MessageAttachmentCreate = typeof messageAttachments.$inferInsert;
export type MessageAttachmentEntity = typeof messageAttachments.$inferSelect;

export type ThreadEntity = typeof threads.$inferSelect;
export const ThreadInsertSchema = createInsertSchema(threads);
export const MessageAttachmentInsertSchema =
	createInsertSchema(messageAttachments);

export type MailboxSyncEntity = typeof mailboxSync.$inferSelect;
export const MailboxSyncInsertSchema = createInsertSchema(mailboxSync);
export type MailboxSyncCreate = typeof mailboxSync.$inferInsert;

export type MailboxThreadEntity = typeof mailboxThreads.$inferSelect;

export type DecryptedEntity = typeof decryptedSecrets.$inferSelect;

export const ProviderSchema = createSelectSchema(providers);
export const SMTPAccountSchema = createSelectSchema(smtpAccounts);

export const CommonProviderEntitySchema = z.union([
	ProviderSchema,
	SMTPAccountSchema,
]);
export type CommonProviderEntity = z.infer<typeof CommonProviderEntitySchema>;
export const WebhookUpdateSchema = createUpdateSchema(webhooks);
export const WebhookCreateSchema = createInsertSchema(webhooks);
export type WebhookSelectEntity = typeof webhooks.$inferSelect;
export type WebhookInsertEntity = typeof webhooks.$inferInsert;

export const IdentityUpdateSchema = createUpdateSchema(identities);

export const LabelInsertSchema = createInsertSchema(labels);
export type LabelCreate = typeof labels.$inferInsert;
export type LabelEntity = typeof labels.$inferSelect;

export type MailboxThreadLabelEntity = typeof mailboxThreadLabels.$inferSelect;

export const ContactInsertSchema = createInsertSchema(contacts);
export type ContactCreate = typeof contacts.$inferInsert;
export type ContactEntity = typeof contacts.$inferSelect;

export type AddressBookEntity = typeof addressBooks.$inferSelect;

export const CalendarInsertSchema = createInsertSchema(calendars);
export type CalendarEntity = typeof calendars.$inferSelect;

export const CalendarEventInsertSchema = createInsertSchema(calendarEvents);
export const CalendarEventUpdateSchema = createUpdateSchema(calendarEvents);
export type CalendarEventEntity = typeof calendarEvents.$inferSelect;

export type CalendarEventAttendeeEntity =
	typeof calendarEventAttendees.$inferSelect;
export const CalendarEventAttendeeInsertSchema = createInsertSchema(calendarEventAttendees,);


export type DriveVolumeEntity = typeof driveVolumes.$inferSelect;
export type DriveEntryEntity = typeof driveEntries.$inferSelect;

export type DraftMessageEntity = typeof draftMessages.$inferSelect;
export const DraftMessageInsertSchema = createInsertSchema(draftMessages);
