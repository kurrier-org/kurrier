import { db, decryptAdminSecrets, identities, smtpAccountSecrets } from "@db";
import { eq } from "drizzle-orm";
import { ImapFlow } from "imapflow";

const retryCounts = new Map<string, number>();
const reconnectTimers = new Map<string, NodeJS.Timeout>();
const MAX_RETRIES = 5;
const BASE_DELAY = 5000;

function safeReconnect(
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) {
	const currentRetries = retryCounts.get(identityId) ?? 0;

	if (currentRetries >= MAX_RETRIES) {
		console.error(`[IMAP:${identityId}] Max retries reached. Cooling down.`);
		return;
	}

	const delay = BASE_DELAY * (currentRetries + 1);
	retryCounts.set(identityId, currentRetries + 1);

	const existing = imapInstances.get(identityId);
	if (existing) {
		try {
			existing.removeAllListeners();
			existing.logout().catch(() => {});
		} catch {}
		imapInstances.delete(identityId);
	}

	if (reconnectTimers.has(identityId)) {
		clearTimeout(reconnectTimers.get(identityId)!);
	}

	const timer = setTimeout(() => {
		reconnectTimers.delete(identityId);
		initSmtpClient(identityId, imapInstances).catch(console.error);
	}, delay);

	reconnectTimers.set(identityId, timer);
}

export const initSmtpClient = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
) => {
	try {
		const existing = imapInstances.get(identityId);
		if (existing && existing.authenticated && existing.usable) {
			return existing;
		}

		if (existing) {
			try {
				existing.removeAllListeners();
				existing.logout().catch(() => {});
			} catch {}
			imapInstances.delete(identityId);
		}
	} catch (err) {
		console.error(`[IMAP:${identityId}] Existing instance check failed`, err);
		safeReconnect(identityId, imapInstances);
		return;
	}

	try {
		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId));

		if (!identity || !identity.smtpAccountId) {
			return;
		}

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
			socketTimeout: 60_000,
			logger: {
				error(data: any) {
					console.error(`[IMAP:${identityId}]`, data.msg ?? data);
				},
				warn() {},
				info() {},
				debug() {},
			},
			logRaw: false,
		});

		try {
			await client.connect();
			retryCounts.set(identityId, 0);
		} catch (err) {
			console.error(`[IMAP:${identityId}] connect() failed:`, err);
			safeReconnect(identityId, imapInstances);
			return;
		}

		imapInstances.set(identityId, client);

		const noopInterval = setInterval(async () => {
			try {
				if (client.usable) {
					await client.noop();
				} else {
					throw new Error("Client not usable");
				}
			} catch (err) {
				console.error(`[IMAP:${identityId}] NOOP failed:`, err);
				clearInterval(noopInterval);
				safeReconnect(identityId, imapInstances);
			}
		}, 5 * 60 * 1000);

		const cleanup = (reason: string) => {
			clearInterval(noopInterval);
			try {
				client.removeAllListeners();
				client.logout().catch(() => {});
			} catch {}
			imapInstances.delete(identityId);
			console.warn(`[IMAP:${identityId}] Disconnected (${reason})`);
			safeReconnect(identityId, imapInstances);
		};

		client.once("close", () => cleanup("close"));
		client.once("error", (err) => {
			console.error(`[IMAP:${identityId}] Error:`, err);
			cleanup("error");
		});

		return client;
	} catch (err) {
		console.error(`[IMAP:${identityId}] init failed`, err);
		safeReconnect(identityId, imapInstances);
		return;
	}
};
