import { ImapFlow, FetchMessageObject } from "imapflow";
import { db, identities, IdentityEntity, mailboxes, mailboxSync } from "@db";
import { and, eq } from "drizzle-orm";
import { parseAndStoreEmail } from "../../message-payload-parser";
import { initSmtpClient } from "../../../lib/imap/imap-client";
import { defaultImapQuota } from "@schema";
import dayjs from "dayjs";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type IdentityQuota = {
	limit: number;
	expiresAt: string;
};

const identityQuotaMap = new Map<string, IdentityQuota>();
export function getOrInitQuota(
	identityId: string,
	dailyLimitBytes: number,
): IdentityQuota {
	const now = dayjs();
	const existing = identityQuotaMap.get(identityId);

	if (existing && now.isBefore(existing.expiresAt)) {
		return existing;
	}

	const quota: IdentityQuota = {
		limit: dailyLimitBytes,
		expiresAt: now.add(2, "minute").toString(),
	};

	identityQuotaMap.set(identityId, quota);
	return quota;
}

function getDailyQuota(identity: IdentityEntity): number {
	const meta = (identity.metaData as any) ?? {};
	const val = Number(meta.dailyQuota);
	return Number.isFinite(val) && val > 0 ? val : defaultImapQuota;
}

function mapImapFlags(flags?: string[] | Set<string>) {
	const f = Array.isArray(flags) ? flags : Array.from(flags ?? []);
	const has = (x: string) => f.some((v) => v.toLowerCase() === x.toLowerCase());

	return {
		seen: has("\\seen"),
		answered: has("\\answered"),
		flagged: has("\\flagged"),
		draft: has("\\draft"),
	};
}

type BackfillMailboxOpts = {
	client: ImapFlow;
	identityId: string;
	ownerId: string;
	mailboxId: string;
	path: string;
	window?: number;
	politeWaitMs?: number;
	quota: IdentityQuota;
};

const DEFAULT_WINDOW = 300;

async function backfillMailboxFull(opts: BackfillMailboxOpts) {
	const {
		client,
		identityId,
		ownerId,
		mailboxId,
		path,
		window = DEFAULT_WINDOW,
		politeWaitMs = 0,
		quota,
	} = opts;

	if (quota.limit <= 0) return;

	const box = await client.mailboxOpen(path, { readOnly: true });
	const top = Math.max(0, (box.uidNext ?? 1) - 1);

	const [sync] = await db
		.select()
		.from(mailboxSync)
		.where(
			and(
				eq(mailboxSync.identityId, identityId),
				eq(mailboxSync.mailboxId, mailboxId),
			),
		);

	if (!sync) {
		console.warn("[imap:backfill-full] mailbox_sync missing", {
			identityId,
			mailboxId,
			path,
		});
		return;
	}

	if (!sync.lastSeenUid || Number(sync.lastSeenUid) === 0) {
		const TAIL_WINDOW = 200;
		const bootLastSeen = Math.max(0, top - TAIL_WINDOW + 1);

		await db
			.update(mailboxSync)
			.set({
				lastSeenUid: bootLastSeen,
				updatedAt: new Date(),
			})
			.where(eq(mailboxSync.id, sync.id));

		// update local copy so any later logic sees it
		sync.lastSeenUid = bootLastSeen as any;
	}

	let cursor = Number(sync.backfillCursorUid ?? 0);

	// Nothing left to backfill for this mailbox
	if (cursor <= 0) {
		await db
			.update(mailboxSync)
			.set({
				phase: "IDLE",
				backfillCursorUid: 0,
				updatedAt: new Date(),
			})
			.where(eq(mailboxSync.id, sync.id));
		return;
	}

	await db
		.update(mailboxSync)
		.set({ phase: "BACKFILL", updatedAt: new Date() })
		.where(eq(mailboxSync.id, sync.id));

	const end = cursor;
	const start = Math.max(1, end - window + 1);
	const range = `${start}:${end}`;
	console.info("[imap:backfill-full] batch range", { identityId, path, range });

	let batchBytes = 0;
	let processedCount = 0;

	for await (const msg of client.fetch(
		{ uid: range },
		{
			uid: true,
			envelope: true,
			flags: true,
			internalDate: true,
			size: true,
			source: true,
		},
	)) {
		if (quota.limit <= 0) break;

		const m = msg as FetchMessageObject;
		const raw = m.source ? m.source.toString() : "";
		if (!raw) continue;

		const size = m.size ?? Buffer.byteLength(raw, "utf8");

		if (size > quota.limit) {
			quota.limit = 0;
			break;
		}

		batchBytes += size;
		processedCount += 1;

		const { seen, answered, flagged } = mapImapFlags(m.flags);
		const flags = Array.from(m.flags ?? []);

		await parseAndStoreEmail(raw, {
			ownerId,
			mailboxId,
			rawStorageKey: `eml/${ownerId}/${mailboxId}/${m.id}.eml`,
			emlKey: String(m.id),
			metaData: {
				imap: {
					uid: m.uid,
					mailboxPath: path,
					flags,
					sizeBytes: m.size ?? null,
					internalDate: m.internalDate ?? null,
				},
			},
			mode: "backfill",
			seen,
			answered,
			flagged,
		});
	}

	console.info("[imap:backfill-full] processed messages", {
		identityId,
		path,
		processedCount,
		batchBytes,
		remainingQuota: quota.limit,
	});

	if (batchBytes > 0) {
		quota.limit = Math.max(0, quota.limit - batchBytes);
	}

	cursor = start - 1;

	await db
		.update(mailboxSync)
		.set({
			backfillCursorUid: cursor,
			phase: cursor <= 0 ? "IDLE" : "BACKFILL",
			updatedAt: new Date(),
		})
		.where(eq(mailboxSync.id, sync.id));

	if (politeWaitMs) {
		await sleep(politeWaitMs);
	}
}

export const startFullBackfill = async (
	imapInstances: Map<string, ImapFlow>,
) => {
	const identitiesRows = await db
		.select()
		.from(identities)
		.where(eq(identities.kind, "email"));
	const filteredRows = identitiesRows.filter((id) => {
		return !!id.smtpAccountId;
	});

	for (const identity of filteredRows) {
		const dailyQuotaBytes = getDailyQuota(identity as IdentityEntity);
		const quota = getOrInitQuota(identity.id, dailyQuotaBytes);

		if (quota.limit <= 0) {
			console.log("[imap:backfill-full] quota exhausted, skipping identity", {
				identityId: identity.id,
				remaining: quota.limit,
			});
			continue;
		}

		const client = await initSmtpClient(identity.id, imapInstances);
		if (!client) {
			console.warn(
				"[imap:backfill-full] could not init imap client for identity",
				identity.id,
			);
			continue;
		}

		await startFullBackfillForIdentity(client, identity.id, quota);
	}
};

export const startFullBackfillForIdentity = async (
	client: ImapFlow,
	identityId: string,
	quota: IdentityQuota,
) => {
	try {
		if (quota.limit <= 0) return;

		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId));

		if (!identity) {
			console.warn("[imap:backfill-full] identity not found", identityId);
			return;
		}

		const ownerId = identity.ownerId;

		const mailboxRows = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.identityId, identityId));

		const isInbox = (row: (typeof mailboxRows)[number]) => {
			const meta = row.metaData as any;
			const imap = meta?.imap ?? {};
			const path = (imap.path as string | undefined) ?? "";
			const specialUse = (imap.specialUse as string | undefined) ?? "";

			return (
				row.isDefault === true ||
				path.toUpperCase() === "INBOX" ||
				specialUse.toUpperCase() === "\\INBOX"
			);
		};

		const inboxFirst = [
			...mailboxRows.filter(isInbox),
			...mailboxRows.filter((r) => !isInbox(r)),
		];

		for (const row of inboxFirst) {
			if (quota.limit <= 0) break;

			const path = (row.metaData as any)?.imap?.path as string | undefined;
			if (!path) continue;
			await backfillMailboxFull({
				client,
				identityId,
				ownerId,
				mailboxId: row.id,
				path,
				quota,
			});
		}
	} catch (err) {
		console.error("[imap:backfill-full] error", err);
	}
};
