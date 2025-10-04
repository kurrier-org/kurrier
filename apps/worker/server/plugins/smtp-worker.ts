import { defineNitroPlugin } from "nitropack/runtime";
import { FetchMessageObject, ImapFlow } from "imapflow";
import { getServerEnv, mailboxKindsList } from "@schema";
import {
	db,
	decryptAdminSecrets,
	identities,
	type IdentityEntity,
	type MailboxCreate,
	mailboxes,
	MailboxInsertSchema,
	mailboxSync,
	MailboxSyncInsertSchema,
	type MailboxUpdate,
	MailboxUpdateSchema,
	smtpAccountSecrets,
} from "@db";
import { and, eq, inArray, sql } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import { parseAndStoreEmail } from "../../lib/message-payload-parser";

const serverConfig = getServerEnv();
import IORedis from "ioredis";
import { Worker } from "bullmq";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const connection = new IORedis({
	maxRetriesPerRequest: null,
	password: serverConfig.REDIS_PASSWORD,
	host: serverConfig.REDIS_HOST || "redis",
	port: Number(serverConfig.REDIS_PORT || 6379),
});

export default defineNitroPlugin(async (nitroApp) => {
	console.log("************************************************************");
	console.log("************************************************************");
	console.log("************************************************************");
	console.log("************************************************************");

	const worker = new Worker(
		"smtp-worker",
		async (job) => {
			if (job.name === "delta-fetch") {
				const identityId = job.data.identityId;
				await deltaFetch(identityId);
			} else if (job.name === "backfill") {
				const identityId = job.data.identityId;
				const client = await initBackfillClient(identityId);
				if (client?.authenticated && client?.usable) {
					await startBackfill(client, identityId);
				}
			}
			return { success: true };
		},
		{ connection },
	);

	worker.on("completed", (job) => {
		console.log(`${job.id} has completed!`);
	});

	worker.on("failed", (job, err) => {
		console.log(`${job?.id} has failed with ${err.message}`);
	});

	const imapInstances = new Map<string, ImapFlow>();

	const deltaFetch = async (identityId: string) => {
		const client = await initBackfillClient(identityId);
		if (!client?.authenticated || !client?.usable) return;

		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId));
		const ownerId = identity?.ownerId;
		if (!ownerId) return;

		const mailboxRows = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.identityId, identityId));

		for (const row of mailboxRows) {
			// Only sync when fully idle (not during backfill or uninitialized)
			const [syncRow] = await db
				.select()
				.from(mailboxSync)
				.where(
					and(
						eq(mailboxSync.identityId, identityId),
						eq(mailboxSync.mailboxId, row.id),
					),
				);
			if (!syncRow) continue;
			if (
				syncRow.phase !== "IDLE" ||
				Number(syncRow.backfillCursorUid || 0) > 0
			)
				continue;

			await syncMailbox({
				client,
				identityId: identityId,
				mailboxId: row.id,
				path: String(row?.metaData?.imap.path),
				window: 500,
				onMessage: async (msg) => {
					const raw = (await msg?.source?.toString()) || "";
					await parseAndStoreEmail(raw, {
						ownerId,
						mailboxId: row.id,
						rawStorageKey: `eml/${ownerId}/${row.id}/${msg.uid}.eml`,
						emlKey: String(msg.id),
					});
				},
			});
		}
	};

	const startBackfill = async (client: ImapFlow, identityId: string) => {
        try {
            const [identity] = await db
                .select()
                .from(identities)
                .where(eq(identities.id, identityId));
            if (!identity) return;

            const ownerId = identity.ownerId;

            await syncMailboxEntities(client, identity);

            const mailboxRows = await db
                .select()
                .from(mailboxes)
                .where(eq(mailboxes.identityId, identityId));
            for (const row of mailboxRows) {
                await backfillMailbox({
                    client,
                    identityId,
                    mailboxId: row.id,
                    path: String(row?.metaData?.imap.path),
                    window: 500,
                    onMessage: async (
                        msg: FetchMessageObject,
                        path: string,
                        identityId: string,
                        mailboxId: string,
                    ) => {
                        const raw = (await msg?.source?.toString()) || "";
                        await parseAndStoreEmail(raw, {
                            ownerId,
                            mailboxId,
                            rawStorageKey: `eml/${ownerId}/${mailboxId}/${msg.uid}.eml`,
                            emlKey: String(msg.id),
                        });
                        return;
                    },
                });
            }
        } catch (err) {
            console.error("Backfill error", err);
        }

	};

	async function backfillMailbox(opts: {
		client: ImapFlow;
		identityId: string;
		mailboxId: string;
		path: string; // IMAP path, e.g. "INBOX"
		window?: number; // batch size (default 500)
		politeWaitMs?: number; // small delay between batches (default 20ms)
		onMessage: (
			msg: FetchMessageObject,
			path: string,
			identityId: string,
			mailboxId: string,
		) => Promise<void>;
	}) {
		const {
			client,
			identityId,
			mailboxId,
			path,
			window = 500,
			politeWaitMs = 50,
			onMessage,
		} = opts;

		// Ensure mailbox is open (read-only is fine)
		await client.mailboxOpen(path, { readOnly: true });

		// Load current cursor
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
			throw new Error(`mailbox_sync row missing for mailboxId=${mailboxId}`);
		}

		let cursor = Number(sync.backfillCursorUid || 0);
		// if (cursor <= 0) {
		// 	// nothing to do
		// 	return;
		// }

        if (cursor <= 0) {
            const head = await client.mailboxOpen(path, { readOnly: true });
            const top = Math.max(0, (head.uidNext ?? 1) - 1);

            await db
                .update(mailboxSync)
                .set({
                    phase: "IDLE",
                    syncedAt: new Date(),
                    lastSeenUid: top,
                    backfillCursorUid: 0,
                    updatedAt: new Date(),
                })
                .where(eq(mailboxSync.id, sync.id));

            return;
        }


        // Mark phase explicitly
		await db
			.update(mailboxSync)
			.set({ phase: "BACKFILL", updatedAt: new Date() })
			.where(eq(mailboxSync.id, sync.id));

		while (cursor > 0) {
			const end = cursor;
			const start = Math.max(1, end - window + 1);

			// Fetch this window (UID range)
			const range = `${start}:${end}`;
			for await (const msg of client.fetch(
				{ uid: range },
				{
					uid: true,
					envelope: true,
					flags: true,
					internalDate: true,
					size: true,
					source: true, // raw RFC822
				},
			)) {
				await onMessage(msg, path, identityId, mailboxId);
			}

			// Move cursor backward and persist
			cursor = start - 1;
			await db
				.update(mailboxSync)
				.set({ backfillCursorUid: cursor, updatedAt: new Date() })
				.where(eq(mailboxSync.id, sync.id));

			if (politeWaitMs) await sleep(politeWaitMs);
		}

		// Done! compute head *after* loop and seed lastSeen for delta
		const headAtFinish = await client.mailboxOpen(path, { readOnly: true });
		const topAtFinish = Math.max(0, (headAtFinish.uidNext ?? 1) - 1);

		await db
			.update(mailboxSync)
			.set({
				phase: "IDLE",
				syncedAt: new Date(),
				lastSeenUid: topAtFinish, // seed delta starting point
				backfillCursorUid: 0, // mark backfill complete
				updatedAt: new Date(),
			})
			.where(eq(mailboxSync.id, sync.id));
	}

	const syncMailboxEntities = async (
		client: ImapFlow,
		identity: IdentityEntity,
	): Promise<void> => {
		const locals = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.identityId, identity.id));
		const touched: string[] = [];

		for await (const mbx of await client.list()) {
			const path = mbx.path;
			const selectable = !Array.from(mbx.flags.values()).includes("\\Noselect");
			if (!selectable) continue;

			touched.push(path);

			const local = locals.find(
				(l) => (l?.metaData?.imap?.path as string | undefined) === path,
			);

			const meta = {
				...(local?.metaData ?? {}),
				imap: {
					path,
					flags: Array.from(mbx.flags ?? []),
					specialUse: (mbx.specialUse as string) ?? null,
					selectable: true,
				},
			};

			if (!local) {
				// insert new mailbox
				const slugifiedName = slugify(mbx.name.toLowerCase());
				const parsedData = MailboxInsertSchema.parse({
					ownerId: identity.ownerId,
					identityId: identity.id,
					name: mbx.name,
					slug: slugifiedName,
					kind: (mailboxKindsList as readonly string[]).includes(slugifiedName)
						? (slugifiedName as (typeof mailboxKindsList)[number])
						: "custom",
					isDefault: path === "INBOX",
					metaData: meta,
				});
				const [newMailbox] = await db
					.insert(mailboxes)
					.values(parsedData as MailboxCreate)
					.returning();

				// seed mailbox_sync for this new mailbox
				const box = await client.mailboxOpen(path, { readOnly: true });
				const uidValidity = box.uidValidity!;
				const backfillCursorUid = Math.max(0, (box.uidNext ?? 1) - 1);

				const mailboxSyncData = MailboxSyncInsertSchema.parse({
					identityId: identity.id,
					mailboxId: newMailbox.id,
					uidValidity,
					lastSeenUid: 0,
					backfillCursorUid,
					phase: "BACKFILL",
				});
				await db.insert(mailboxSync).values(mailboxSyncData);
			} else {
				// update existing mailbox metadata
				const parsedData = MailboxUpdateSchema.parse({
					name: mbx.name,
					slug: slugify(mbx.name || path),
					metaData: meta as any,
					updatedAt: new Date(),
				}) as MailboxUpdate;
				await db
					.update(mailboxes)
					.set(parsedData)
					.where(eq(mailboxes.id, local.id));

				// ensure mailbox_sync exists (e.g., pre-seeded Gmail folders)
				const [maybeSync] = await db
					.select()
					.from(mailboxSync)
					.where(eq(mailboxSync.mailboxId, local.id));
				if (!maybeSync) {
					const box = await client.mailboxOpen(path, { readOnly: true });
					const uidValidity = box.uidValidity!;
					const top = Math.max(0, (box.uidNext ?? 1) - 1);
					const mailboxSyncData = MailboxSyncInsertSchema.parse({
						identityId: identity.id,
						mailboxId: local.id,
						uidValidity,
						lastSeenUid: 0, // we'll backfill next
						backfillCursorUid: top,
						phase: "BACKFILL",
					});
					await db.insert(mailboxSync).values(mailboxSyncData);
				}
			}
		}

		// mark vanished as non-selectable
		const remoteSet = new Set(touched);
		const vanished = locals.filter((l) => {
			const p = l?.metaData?.imap?.path as string | undefined;
			return p && !remoteSet.has(p);
		});
		if (vanished.length) {
			await db
				.update(mailboxes)
				.set({
					metaData: sql`jsonb_set(coalesce(meta_data,'{}'::jsonb), '{imap,selectable}', 'false'::jsonb, true)`,
					updatedAt: new Date(),
				})
				.where(
					inArray(
						mailboxes.id,
						vanished.map((v) => v.id),
					),
				);
		}
	};

	const initBackfillClient = async (identityId: string) => {
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
					credentials.IMAP_SECURE === "true" ||
					credentials.IMAP_SECURE === true,
				auth: {
					user: credentials.IMAP_USERNAME,
					pass: credentials.IMAP_PASSWORD,
				},
			});
			await client.connect();
			imapInstances.set(identity.id, client);
			return client;
		}
	};

	async function syncMailbox(opts: {
		client: ImapFlow;
		identityId: string;
		mailboxId: string;
		path: string;
		window?: number; // default 500
		politeWaitMs?: number; // default 20ms
		onMessage: (
			msg: FetchMessageObject,
			path: string,
			identityId: string,
			mailboxId: string,
		) => Promise<void>;
	}) {
		const {
			client,
			identityId,
			mailboxId,
			path,
			window = 500,
			politeWaitMs = 20,
			onMessage,
		} = opts;

		await client.mailboxOpen(path, { readOnly: true });

		const [sync] = await db
			.select()
			.from(mailboxSync)
			.where(
				and(
					eq(mailboxSync.identityId, identityId),
					eq(mailboxSync.mailboxId, mailboxId),
				),
			);
		if (!sync)
			throw new Error(`mailbox_sync row missing for mailboxId=${mailboxId}`);

		let lastSeen = Number(sync.lastSeenUid || 0);

		// What's the current head?
		const box = await client.mailboxOpen(path, { readOnly: true });
		const currentTop = Math.max(0, (box.uidNext ?? 1) - 1);
		if (currentTop <= lastSeen) return; // nothing new

		let start = lastSeen + 1;
		while (start <= currentTop) {
			const end = Math.min(currentTop, start + window - 1);
			const range = `${start}:${end}`;

			let maxUid = lastSeen;

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
				await onMessage(msg, path, identityId, mailboxId);
				if (msg.uid && msg.uid > maxUid) maxUid = msg.uid;
			}

			if (maxUid > lastSeen) {
				lastSeen = maxUid;
				await db
					.update(mailboxSync)
					.set({ lastSeenUid: lastSeen, updatedAt: new Date() })
					.where(eq(mailboxSync.id, sync.id));
			}

			start = end + 1;
			if (politeWaitMs) await sleep(politeWaitMs);
		}

		await db
			.update(mailboxSync)
			.set({ phase: "IDLE", syncedAt: new Date(), updatedAt: new Date() })
			.where(eq(mailboxSync.id, sync.id));
	}

	nitroApp.hooks.hookOnce("close", async () => {
		// Will run when nitro is closed
		console.log("Closing nitro server...");
		try {
			for (const [identityId, client] of imapInstances) {
				try {
					await client.logout();
					console.log(
						`Logged out from IMAP server for identityId: ${identityId}`,
					);
				} catch (err) {
					console.error(
						`Failed to logout cleanly for identityId: ${identityId}`,
						err,
					);
				}
			}
			console.log("Logged out from IMAP server");
		} catch (err) {
			console.error("Failed to logout cleanly", err);
		}
		console.log("Task is done!");
	});
});
