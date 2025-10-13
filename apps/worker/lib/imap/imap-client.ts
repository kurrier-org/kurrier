import { db, decryptAdminSecrets, identities, smtpAccountSecrets } from "@db";
import { eq } from "drizzle-orm";
import { ImapFlow } from "imapflow";

function safeReconnect(
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) {
	const existing = imapInstances.get(identityId);
	if (existing) {
		try {
			existing.logout();
		} catch {}
		imapInstances.delete(identityId);
	}
	setTimeout(
		() => initSmtpClient(identityId, imapInstances).catch(console.error),
		5000,
	);
}

export const initSmtpClient = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) => {
	if (
		imapInstances.has(identityId) &&
		imapInstances.get(identityId)?.authenticated &&
		imapInstances.get(identityId)?.usable
	) {
		return imapInstances.get(identityId)!;
	} else {
		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId));
		const [secrets] = await decryptAdminSecrets({
			linkTable: smtpAccountSecrets,
			foreignCol: smtpAccountSecrets.accountId,
			secretIdCol: smtpAccountSecrets.secretId,
			ownerId: identity.ownerId,
			parentId: String(identity.smtpAccountId),
		});
		const credentials = secrets?.vault?.decrypted_secret
			? JSON.parse(secrets.vault.decrypted_secret)
			: {};
		const client = new ImapFlow({
			host: credentials.IMAP_HOST,
			port: credentials.IMAP_PORT,
			secure:
				credentials.IMAP_SECURE === "true" || credentials.IMAP_SECURE === true,
			auth: {
				user: credentials.IMAP_USERNAME,
				pass: credentials.IMAP_PASSWORD,
			},
		});
		await client.connect();
		imapInstances.set(identity.id, client);

		const noopInterval = setInterval(
			async () => {
				if (client.usable) {
					try {
						await client.noop();
					} catch (err) {
						console.error(`[IMAP:${identityId}] NOOP failed:`, err);
					}
				}
			},
			5 * 60 * 1000,
		);

		const cleanup = (reason: string) => {
			clearInterval(noopInterval);
			imapInstances.delete(identity.id);
			console.warn(
				`[IMAP:${identityId}] Disconnected (${reason}), reconnecting...`,
			);
			safeReconnect(identityId, imapInstances);
		};

		client.once("close", () => cleanup("close"));
		client.once("error", (err) => {
			console.error(`[IMAP:${identityId}] Error:`, err);
			cleanup("error");
		});

		return client;
	}
};
