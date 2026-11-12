import {
	db,
	decryptAdminSecrets,
	identities,
	microsoftAccounts,
	smtpAccountSecrets,
} from "@db";
import { eq } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import { kurrierServer } from "@distribution/kurrier-server";
import { getMicrosoftAccessToken } from "@providers";

const MAX_AUTH_FAILURES = 3;
const MAX_CONNECTION_FAILURES = 5;
const CONNECTION_COOLDOWN_MS = 60_000;

type ConnectionFailure = {
	count: number;
	authentication: boolean;
	retryAfter?: number;
};

const connectionFailures = new Map<string, ConnectionFailure>();

const pendingConnections = new WeakMap<
	Map<string, ImapFlow>,
	Map<string, Promise<ImapFlow | undefined>>
>();

export const canAttemptImapConnection = (identityId: string): boolean => {
	const failure = connectionFailures.get(identityId);

	if (!failure) return true;

	if (failure.retryAfter) {
		if (Date.now() < failure.retryAfter) return false;

		connectionFailures.delete(identityId);
		return true;
	}

	return true;
};

export const resetImapConnectionFailures = (identityId: string): void => {
	connectionFailures.delete(identityId);
};

const recordImapConnectionFailure = (
	identityId: string,
	err: unknown,
): void => {
	const authentication =
		(err as { authenticationFailed?: boolean } | null)?.authenticationFailed ===
		true;

	const previous = connectionFailures.get(identityId);

	const count =
		previous?.authentication === authentication ? previous.count + 1 : 1;

	const limit = authentication ? MAX_AUTH_FAILURES : MAX_CONNECTION_FAILURES;

	const retryAfter =
		count >= limit ? Date.now() + CONNECTION_COOLDOWN_MS : undefined;

	connectionFailures.set(identityId, {
		count,
		authentication,
		retryAfter,
	});

	if (retryAfter) {
		console.warn(
			`[IMAP:${identityId}] ${authentication ? "authentication" : "connection"} failures reached ${count}; retrying after cooldown`,
		);
	}
};

const createImapClient = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
): Promise<ImapFlow | undefined> => {
	const existing = imapInstances.get(identityId);

	if (existing?.authenticated && existing?.usable) {
		return existing;
	}

	if (existing) {
		imapInstances.delete(identityId);

		try {
			existing.removeAllListeners();
			existing.close();
		} catch {
			console.warn(`[IMAP:${identityId}] failed to close stale client`);
		}
	}

	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId))
		.limit(1);

	if (!identity) {
		return;
	}

	const hostedCredentials = await kurrierServer.hooks.run(
		"imap.resolveCredentials",
		{ identityId },
	);

	const [microsoftAccount] = await db
		.select()
		.from(microsoftAccounts)
		.where(eq(microsoftAccounts.identityId, identityId))
		.limit(1);

	if (!hostedCredentials && !identity.smtpAccountId && !microsoftAccount) {
		return;
	}

	let credentials: Record<string, any> | undefined =
		hostedCredentials || undefined;

	if (!credentials && identity.smtpAccountId) {
		const [secrets] = await decryptAdminSecrets({
			linkTable: smtpAccountSecrets,
			foreignCol: smtpAccountSecrets.accountId,
			secretIdCol: smtpAccountSecrets.secretId,
			ownerId: identity.ownerId,
			parentId: String(identity.smtpAccountId),
		});

		credentials = secrets?.vault?.decrypted_secret
			? JSON.parse(secrets.vault.decrypted_secret)
			: {};
	}

	if (!credentials && microsoftAccount) {
		const accessToken = await getMicrosoftAccessToken(microsoftAccount.id);

		credentials = {
			IMAP_HOST: "outlook.office365.com",
			IMAP_PORT: 993,
			IMAP_SECURE: true,
			IMAP_USERNAME: microsoftAccount.email,
			IMAP_ACCESS_TOKEN: accessToken,
		};
	}

	if (!credentials) {
		return;
	}

	const client = new ImapFlow({
		host: credentials.IMAP_HOST,
		port: Number(credentials.IMAP_PORT),
		disableCompression: true,
		secure:
			credentials.IMAP_SECURE === "true" || credentials.IMAP_SECURE === true,
		tls:
			hostedCredentials && process.env.NODE_ENV === "production"
				? { servername: "mx.kurriermail.com" }
				: undefined,
		auth: credentials.IMAP_ACCESS_TOKEN
			? {
					user: credentials.IMAP_USERNAME,
					accessToken: credentials.IMAP_ACCESS_TOKEN,
				}
			: {
					user: credentials.IMAP_USERNAME,
					pass: credentials.IMAP_PASSWORD,
				},
		socketTimeout: 10 * 60_000,
		logger: {
			error() {},
			warn() {},
			info() {},
			debug() {},
		},
		logRaw: false,
	});

	client.once("close", () => {
		if (imapInstances.get(identityId) === client) {
			imapInstances.delete(identityId);
		}
	});

	client.once("error", (err) => {
		if (imapInstances.get(identityId) === client) {
			imapInstances.delete(identityId);
		}

		console.warn(
			`[IMAP:${identityId}] connection error:`,
			err instanceof Error ? err.message : String(err),
		);
	});

	try {
		await client.connect();
		resetImapConnectionFailures(identityId);
	} catch (err) {
		recordImapConnectionFailure(identityId, err);

		console.warn(
			`[IMAP:${identityId}] connection failed:`,
			err instanceof Error ? err.message : String(err),
		);

		try {
			client.removeAllListeners();
			client.close();
		} catch {}

		throw err;
	}

	imapInstances.set(identityId, client);

	return client;
};

export const initSmtpClient = (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
): Promise<ImapFlow | undefined> => {
	const existing = imapInstances.get(identityId);

	if (existing?.authenticated && existing?.usable) {
		return Promise.resolve(existing);
	}

	let pending = pendingConnections.get(imapInstances);

	if (!pending) {
		pending = new Map();
		pendingConnections.set(imapInstances, pending);
	}

	const current = pending.get(identityId);

	if (current) {
		return current;
	}

	if (!canAttemptImapConnection(identityId)) {
		return Promise.resolve(undefined);
	}

	const connection = createImapClient(identityId, imapInstances);

	pending.set(identityId, connection);

	void connection
		.finally(() => {
			if (pending.get(identityId) === connection) {
				pending.delete(identityId);
			}
		})
		.catch(() => {});

	return connection;
};
