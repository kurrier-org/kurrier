import type { MailboxFlagOperation, MailboxProvider } from "../core";
import type { ImapFlow } from "imapflow";
import { db, messages } from "@db";
import { and, eq } from "drizzle-orm";

export class ImapMailboxProvider implements MailboxProvider {
	constructor(private readonly client: ImapFlow) {}

	async setFlags(input: {
		threadId: string;
		mailboxId: string;
		op: MailboxFlagOperation;
	}): Promise<void> {
		const operations = {
			read: { flag: "\\Seen", action: "add" },
			unread: { flag: "\\Seen", action: "remove" },
			flag: { flag: "\\Flagged", action: "add" },
			unflag: { flag: "\\Flagged", action: "remove" },
			answered: { flag: "\\Answered", action: "add" },
			unanswered: { flag: "\\Answered", action: "remove" },
		} as const;

		const operation = operations[input.op];

		const threadMessages = await db
			.select({ metaData: messages.metaData })
			.from(messages)
			.where(
				and(
					eq(messages.threadId, input.threadId),
					eq(messages.mailboxId, input.mailboxId),
				),
			);

		if (!threadMessages.length) return;

		const byMailbox = new Map<string, number[]>();

		for (const message of threadMessages) {
			const imap = (message.metaData as any)?.imap;
			const uid = Number(imap?.uid);
			const mailboxPath = imap?.mailboxPath as string | undefined;

			if (!uid || !mailboxPath) continue;

			const uids = byMailbox.get(mailboxPath) ?? [];
			uids.push(uid);
			byMailbox.set(mailboxPath, uids);
		}

		if (!byMailbox.size) {
			throw new Error(`No IMAP UIDs found for thread ${input.threadId}`);
		}

		for (const [mailboxPath, uids] of byMailbox) {
			const started = Date.now();
			const lock = await this.client.getMailboxLock(mailboxPath);

			console.log(
				`[IMAP FLAGS] lock acquired in ${Date.now() - started}ms path=${mailboxPath}`,
			);

			try {
				const sortedUids = uids.sort((a, b) => a - b);

				if (operation.action === "add") {
					await this.client.messageFlagsAdd(sortedUids, [operation.flag], {
						uid: true,
					});
				} else {
					await this.client.messageFlagsRemove(sortedUids, [operation.flag], {
						uid: true,
					});
				}
			} finally {
				lock.release();
			}
		}
	}

	async moveMessages(input: {
		sourcePath: string;
		destinationPath: string;
		uids: number[];
	}): Promise<Map<number, number> | undefined> {
		const lock = await this.client.getMailboxLock(input.sourcePath);

		try {
			const result = await this.client.messageMove(
				input.uids,
				input.destinationPath,
				{ uid: true },
			);

			if (!result) {
				throw new Error(
					`IMAP move failed: ${input.sourcePath} → ${input.destinationPath}`,
				);
			}

			return result.uidMap;
		} finally {
			lock.release();
		}
	}

	async deleteMessages(input: {
		mailboxPath: string;
		uids: number[];
	}): Promise<void> {
		if (!input.uids.length) return;

		const lock = await this.client.getMailboxLock(input.mailboxPath);

		try {
			await this.client.messageDelete(input.uids, { uid: true });
		} finally {
			lock.release();
		}
	}

	async createFolder(input: { path: string }): Promise<void> {
		console.log("[IMAP CREATE] Before", {
			path: input.path,
			folders: (await this.client.list()).map((m) => m.path),
		});

		const result = await this.client.mailboxCreate(input.path);

		console.log("[IMAP CREATE] Result", result);

		console.log("[IMAP CREATE] After", {
			folders: (await this.client.list()).map((m) => m.path),
		});

		try {
			await this.client.mailboxSubscribe(input.path);
		} catch (err) {
			console.warn("[IMAP CREATE] Subscribe failed", err);
		}
	}

	async deleteFolder(input: { path: string }): Promise<void> {
		console.log("[IMAP DELETE] Before", {
			path: input.path,
			folders: (await this.client.list()).map((m) => m.path),
		});

		const result = await this.client.mailboxDelete(input.path);

		console.log("[IMAP DELETE] Result", result);

		console.log("[IMAP DELETE] After", {
			folders: (await this.client.list()).map((m) => m.path),
		});
	}
}
