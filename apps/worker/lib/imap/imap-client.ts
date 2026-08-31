import {
	db,
	decryptAdminSecrets,
	identities,
	smtpAccountSecrets,
	updateSecretAdmin,
} from "@db";
import {
	loadMicrosoftCredentials,
} from "@providers";
import { eq } from "drizzle-orm";
import { ImapFlow } from "imapflow";

export const initSmtpClient = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) => {
	const existing = imapInstances.get(identityId);

	if (existing?.authenticated && existing?.usable) {
		return existing;
	}
	if (existing) {
		imapInstances.delete(identityId);

		try {
			existing.removeAllListeners();
			existing.close();
		} catch (err) {
			console.warn(`[IMAP:${identityId}] Failed to close stale client`, err);
		}
	}

	try {
		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId))
			.limit(1);

		if (!identity?.smtpAccountId) {
			return;
		}

		const [secrets] = await decryptAdminSecrets({
			linkTable: smtpAccountSecrets,
			foreignCol: smtpAccountSecrets.accountId,
			secretIdCol: smtpAccountSecrets.secretId,
			ownerId: identity.ownerId,
			parentId: String(identity.smtpAccountId),
		});

		let credentials = secrets?.vault?.decrypted_secret
			? JSON.parse(secrets.vault.decrypted_secret)
			: {};

		credentials = await loadMicrosoftCredentials(credentials, {
			key: String(secrets.metaId),
			distributed: true,
			persist: async (next) => {
				await updateSecretAdmin(String(secrets.metaId), {
					value: JSON.stringify(next),
					expectedEncryptedValue: secrets.encryptedValue,
				});
			},
			load: async () => {
				const [latest] = await decryptAdminSecrets({
					linkTable: smtpAccountSecrets,
					foreignCol: smtpAccountSecrets.accountId,
					secretIdCol: smtpAccountSecrets.secretId,
					ownerId: identity.ownerId,
					parentId: String(identity.smtpAccountId),
				});
				return latest?.vault?.decrypted_secret ? JSON.parse(latest.vault.decrypted_secret) : null;
			},
		});

		const client = new ImapFlow({
			host: credentials.IMAP_HOST,
			port: Number(credentials.IMAP_PORT),
			secure:
				credentials.IMAP_SECURE === "true" || credentials.IMAP_SECURE === true,

			auth:
				credentials.IMAP_AUTH_METHOD === "xoauth2"
					? {
							user: credentials.IMAP_USERNAME,
							accessToken: credentials.IMAP_ACCESS_TOKEN,
						}
					: {
							user: credentials.IMAP_USERNAME,
							pass: credentials.IMAP_PASSWORD,
						},

			/*
			 * Keep this unchanged for now.
			 *
			 * We'll deal with timeout behavior separately once the
			 * reconnect ownership issue is fixed.
			 */
			socketTimeout: 60_000,

			logger: {
				error(data: unknown) {
					console.error(
						`[IMAP:${identityId}]`,
						(data as { msg?: unknown })?.msg ?? data,
					);
				},
				warn(data: unknown) {
					console.warn(
						`[IMAP:${identityId}]`,
						(data as { msg?: unknown })?.msg ?? data,
					);
				},
				info() {},
				debug() {},
			},

			logRaw: false,
		});

		/*
		 * Register lifecycle handlers before connecting so we don't
		 * miss an early close/error event.
		 */
		client.once("close", () => {
			/*
			 * Only remove this client if it is still the active client.
			 * A newer connection may already have replaced it.
			 */
			if (imapInstances.get(identityId) === client) {
				imapInstances.delete(identityId);
			}

			console.warn(`[IMAP:${identityId}] Disconnected (close)`);
		});

		client.once("error", (err) => {
			console.error(`[IMAP:${identityId}] Error:`, err);

			if (imapInstances.get(identityId) === client) {
				imapInstances.delete(identityId);
			}
		});

		try {
			await client.connect();
		} catch (err) {
			console.error(`[IMAP:${identityId}] connect() failed:`, err);

			if (imapInstances.get(identityId) === client) {
				imapInstances.delete(identityId);
			}

			try {
				client.removeAllListeners();
				client.close();
			} catch {}

			throw err;
		}

		imapInstances.set(identityId, client);

		return client;
	} catch (err) {
		console.error(`[IMAP:${identityId}] init failed`, err);
		throw err;
	}
};
