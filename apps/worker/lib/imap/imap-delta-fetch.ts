import {
	db,
	identities,
	mailboxes,
	mailboxSync
} from "@db";
import { and, eq } from "drizzle-orm";
import { parseAndStoreEmail } from "../message-payload-parser";
import { initSmtpClient } from "./imap-client";
import type { ImapFlow } from "imapflow";
import { syncMailbox } from "./imap-sync-mailbox";
import { canSyncIdentity } from "../access";

const runningDeltaFetches = new Map<string, Promise<void>>();

async function runDeltaFetch(
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
	options: { reconcile?: boolean } = {},
) {
	const client = await initSmtpClient(identityId, imapInstances);

	if (!client?.authenticated || !client?.usable) {
		console.warn(
			`[deltaFetch:${identityId}] IMAP client not usable`,
		);
		return;
	}

	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, identityId))
		.limit(1);

	const ownerId = identity?.ownerId;
	const workspaceId = identity?.workspaceId;

	if (!ownerId || !workspaceId) {
		console.warn(
			`[deltaFetch:${identityId}] identity missing owner/workspace`,
		);
		return;
	}

	const mailboxRows = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.identityId, identityId));

	for (const row of mailboxRows) {
		const [syncRow] = await db
			.select()
			.from(mailboxSync)
			.where(
				and(
					eq(mailboxSync.identityId, identityId),
					eq(mailboxSync.mailboxId, row.id),
				),
			)
			.limit(1);

		console.log(`[deltaFetch:${identityId}] mailbox=${row.name} sync=${!!syncRow}`);

		if (!syncRow) {
			continue;
		}

		const path = String(
			(row.metaData as any)?.imap?.path ?? row.name,
		);

		if (!path) {
			continue;
		}

		await syncMailbox({
			client,
			identityId,
			workspaceId,
			mailboxId: row.id,
			path,
			window: 500,
			reconcile: options.reconcile ?? false,
			onMessage: async (msg, path: string) => {
				const uid = msg.uid;
				const raw = msg.source?.toString() ?? "";

				if (!raw) {
					throw new Error(
						`IMAP returned empty message source: ${path} uid=${uid}`,
					);
				}

				const flags = msg.flags ?? new Set<string>();

				await parseAndStoreEmail(raw, {
					ownerId,
					workspaceId,
					mailboxId: row.id,
					rawStorageKey: `eml/${ownerId}/${row.id}/${uid}.eml`,
					emlKey: String(msg.id),
					metaData: {
						imap: {
							uid,
							mailboxPath: path,
							flags: [...flags],
						},
					},
					seen: flags.has("\\Seen"),
					flagged: flags.has("\\Flagged"),
					answered: flags.has("\\Answered"),
				});
			},
		});
	}
}

export const deltaFetch = async (
	identityId: string,
	imapInstances: Map<string, ImapFlow>,
	options: { reconcile?: boolean } = {},
) => {
	console.info(`[deltaFetch:${identityId}] invoked`);

	if (!(await canSyncIdentity(identityId))) {
		console.info(
			`[IMAP] delta sync disabled identity=${identityId}`,
		);
		return;
	}

	const existing = runningDeltaFetches.get(identityId);

	if (existing) {
		console.log(
			`[deltaFetch:${identityId}] waiting for existing sync`,
		);

		await existing;

		if (!options.reconcile) return;
	}

	if (existing) {
		console.log(
			`[deltaFetch:${identityId}] already running; joining existing sync`,
		);

		return existing;
	}

	const running = runDeltaFetch(
		identityId,
		imapInstances,
		options
	).finally(() => {
		if (runningDeltaFetches.get(identityId) === running) {
			runningDeltaFetches.delete(identityId);
		}
	});

	runningDeltaFetches.set(identityId, running);

	return running;
};
