import type { ImapFlow } from "imapflow";
import type { MailboxProvider } from "../core";
import { ImapMailboxProvider } from "./imap";
import { LocalMailboxProvider } from "./local";

export type MailboxProviderType = "imap" | "google" | "jmap" | "local";

export type MailboxContext = {
	getIdentity: (identityId: string) => Promise<{
		smtpAccountId: string | null;
		providerType?: string | null;
		metaData?: Record<string, any> | null;
	} | null>;
	getImapClient: (identityId: string) => Promise<ImapFlow | undefined>;
};

export async function resolveMailboxProvider(
	identityId: string,
	context: MailboxContext,
): Promise<MailboxProvider> {
	const identity = await context.getIdentity(identityId);

	if (!identity) {
		throw new Error(`Identity not found: ${identityId}`);
	}

	if (identity.providerType === "google") {
		throw new Error("Gmail mailbox provider not implemented");
	}

	if (identity.providerType === "jmap") {
		throw new Error("JMAP mailbox provider not implemented");
	}

	const isHosted = identity.metaData?.provider === "kurrier-mail";
	const isImap =
		isHosted ||
		identity.metaData?.provider === "microsoft" ||
		Boolean(identity.smtpAccountId);

	if (isImap) {
		const client = await context.getImapClient(identityId);

		if (!client?.authenticated || !client?.usable) {
			throw new Error(`IMAP connection unavailable: ${identityId}`);
		}

		return new ImapMailboxProvider(client);
	}

	return new LocalMailboxProvider();
}

export function createMailboxProvider(
	provider: MailboxProviderType,
	config: unknown,
): MailboxProvider {
	switch (provider) {
		case "imap":
			return new ImapMailboxProvider(config as ImapFlow);

		default:
			throw new Error(`Mailbox provider not implemented: ${provider}`);
	}
}
