export type ImapCredentials = {
	IMAP_HOST: string;
	IMAP_PORT: number;
	IMAP_SECURE: boolean;
	IMAP_USERNAME: string;
	IMAP_PASSWORD: string;
};

export type MailSendInput = {
	to: string[];
	opts: {
		cc?: string[];
		bcc?: string[];
		subject: string;
		text: string;
		html: string;
		from: string;
		inReplyTo: string;
		references: string[];
		headers?: Record<string, string>;
		attachments?: {
			name: string;
			content: Blob;
			contentType: string;
		}[];
	};
};

export type MailSendResult = {
	success: boolean;
	MessageId?: string;
	error?: string;
};

export type HookMap = {
	"workspace.beforeCreate": {
		userId: string;
	};

	"workspace.afterCreate": {
		userId: string;
		workspaceId: string;
	};

	"mail.beforeSend": {
		workspaceId: string;
		identityId: string;
		input: MailSendInput;
	};

	"imap.resolveCredentials": {
		identityId: string;
	};

	"imap.listIdentities": {};
};

export type HookName = keyof HookMap;

type HookReturn<K extends HookName> = K extends "mail.beforeSend"
	? MailSendResult | void
	: K extends "imap.resolveCredentials"
		? ImapCredentials | void
		: K extends "imap.listIdentities"
			? string[] | void
			: void;

export type HookHandler<K extends HookName> = (
	context: HookMap[K],
) => HookReturn<K> | Promise<HookReturn<K>>;
