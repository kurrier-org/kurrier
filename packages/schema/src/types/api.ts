import { z } from "zod";

const emailAddress = z.string().trim().email();
const recipientsSchema = z.union([
	emailAddress,
	z.array(emailAddress).nonempty(),
]);
const attachmentSchema = z.object({
	filename: z.string().min(1),
	contentType: z.string().min(1),
	content: z.string().min(1),
});

export const EmailSendSchema = z
	.object({
		identityId: z.string().min(1),
		to: emailAddress,
		subject: z.string().min(1),
		html: z.string().min(1).optional(),
		text: z.string().min(1).optional(),
		cc: recipientsSchema.optional(),
		bcc: recipientsSchema.optional(),
		attachments: z.array(attachmentSchema).optional(),
	})
	.refine((data) => !!data.html || !!data.text, {
		message: "Either 'html' or 'text' must be provided.",
		path: ["html"],
	});

export type EmailSendInput = z.infer<typeof EmailSendSchema>;

const smtpSettingsSchema = z.object({
	host: z.string().trim().min(1),
	port: z.coerce.number().int().min(1).max(65535),
	username: z.string().min(1),
	password: z.string().min(1),
	secure: z.boolean().optional(),
	pool: z.boolean().optional(),
});

const imapSettingsSchema = z.object({
	host: z.string().trim().min(1),
	port: z.coerce.number().int().min(1).max(65535),
	username: z.string().min(1),
	password: z.string().min(1),
	secure: z.boolean().optional(),
});

export const SmtpAccountCreateSchema = z.object({
	label: z.string().trim().min(1),
	smtp: smtpSettingsSchema,
	// Optional: only needed to receive/sync messages over IMAP
	imap: imapSettingsSchema.optional(),
	// Admin API key only: create the account on behalf of this user
	userEmail: emailAddress.optional(),
});

export type SmtpAccountCreateInput = z.infer<typeof SmtpAccountCreateSchema>;

export const SmtpAccountUpdateSchema = z.object({
	label: z.string().trim().min(1).optional(),
	smtp: smtpSettingsSchema.partial().optional(),
	// Pass null to remove the IMAP settings entirely
	imap: imapSettingsSchema.partial().nullable().optional(),
});

export type SmtpAccountUpdateInput = z.infer<typeof SmtpAccountUpdateSchema>;

export const IdentityCreateApiSchema = z.object({
	value: emailAddress,
	displayName: z.string().trim().min(1).optional(),
	smtpAccountId: z.string().min(1),
	sharedWithWorkspace: z.boolean().optional().default(false),
	// Workspace member user ids to grant access to; defaults to the key owner
	memberIds: z.array(z.string().min(1)).optional(),
	dailyQuota: z.coerce.number().int().positive().optional(),
	// Admin API key only: create the identity on behalf of this user
	userEmail: emailAddress.optional(),
});

export type IdentityCreateApiInput = z.infer<typeof IdentityCreateApiSchema>;

export const UserCreateApiSchema = z.object({
	email: emailAddress,
	workspaceName: z.string().trim().min(1).optional(),
});

export type UserCreateApiInput = z.infer<typeof UserCreateApiSchema>;
