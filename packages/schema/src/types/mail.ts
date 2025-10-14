import { z } from "zod";

export const mailboxKindsList = [
	"inbox",
	"sent",
	"drafts",
	"archive",
	"spam",
	"trash",
	"outbox",
	"custom",
] as const;

export const MailboxKindEnum = z.enum(mailboxKindsList);
export type MailboxKind = z.infer<typeof MailboxKindEnum>;

export const MailboxKindDisplay: Record<MailboxKind, string> = {
	inbox: "Inbox",
	sent: "Sent",
	drafts: "Drafts",
	archive: "Archive",
	spam: "Spam",
	trash: "Trash",
	outbox: "Outbox",
	custom: "Custom Folder",
};

//
// Message states
//
export const messageStatesList = [
	"normal",
	"bounced",
	"queued",
	"failed",
] as const;

export const mailboxSyncPhase = ["BOOTSTRAP", "BACKFILL", "IDLE"] as const;

export const messagePriorityList = ["low", "medium", "high"] as const;

export const MessageStateEnum = z.enum(messageStatesList);
export type MessageState = z.infer<typeof MessageStateEnum>;

export const MessageStateDisplay: Record<MessageState, string> = {
	normal: "Normal",
	bounced: "Bounced",
	queued: "Queued",
	failed: "Failed",
};

export const SYSTEM_MAILBOXES: Array<{
	kind: MailboxKind;
	isDefault: boolean;
}> = [
	{ kind: "inbox", isDefault: true }, // entrypoint
	{ kind: "sent", isDefault: false },
	{ kind: "trash", isDefault: false },
	{ kind: "spam", isDefault: false },
];

export const SMTP_MAILBOXES: Array<{
	kind: MailboxKind;
	isDefault: boolean;
}> = [{ kind: "inbox", isDefault: true }];

export type EmailAddressJSON = {
	address?: string | null;
	name: string;
	group?: EmailAddressJSON[];
};

export type AddressObjectJSON = {
	value: EmailAddressJSON[];
	html: string;
	text: string;
};

export type ComposeMode = "reply" | "forward" | "new";

export type MailComposeInput = {
	messageId: string; // original message (for reply/forward)
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject?: string;
	text?: string;
	html?: string;
	mode: ComposeMode;
};

export type BackfillItem = {
	mailboxId: string;
	identityId: string;
	path: string;
	specialUse: string | null;
	priority: number; // lower = sooner
};

export type MailerSendMailOptions = {
	from: string;
	subject: string;
	text?: string;
	html?: string;
	inReplyTo?: string;
	references?: string[];
	attachments?: {
		name: string;
		content: Blob;
		contentType?: string;
	}[];
};
