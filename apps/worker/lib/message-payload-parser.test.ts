import assert from "node:assert/strict";
import { mock, test } from "node:test";

const redisLookups: string[] = [];
const existingMessage = {
	id: "existing-message",
	ownerId: "owner-1",
	mailboxId: "mailbox-1",
	messageId: "<replayed@example.test>",
	metaData: { imap: { uid: 1 } },
	seen: false,
	answered: false,
	flagged: false,
};

const db = {
	select: () => ({
		from: () => ({
			where: () => ({
				limit: async () => [existingMessage],
			}),
		}),
	}),
	update: () => ({
		set: () => ({
			where: async () => undefined,
		}),
	}),
};

mock.module("../../../packages/db/src/index.ts", {
	namedExports: {
		db,
		messages: {
			id: "id",
			mailboxId: "mailboxId",
			messageId: "messageId",
		},
	},
});
mock.module("../../../packages/common/src/index.ts", {
	namedExports: {
		generateSnippet: () => "snippet",
		upsertMailboxThreadItem: async () => undefined,
	},
});
mock.module("./create-s3-client", {
	namedExports: { s3: { send: async () => undefined } },
});
mock.module("./message-parser-contacts", {
	namedExports: {
		upsertWorkspaceSharedContactFromMessage: async () => null,
	},
});
mock.module("drizzle-orm", {
	namedExports: {
		and: (...conditions: unknown[]) => conditions,
		eq: (column: unknown, value: unknown) => [column, value],
	},
});
mock.module("./get-redis", {
	namedExports: {
		getRedis: async () => {
			redisLookups.push("getRedis");
			return { webPushQueue: { add: async () => redisLookups.push("add") } };
		},
	},
});

test("replaying an existing message does not acquire or enqueue a web push job", async () => {
	const { parseAndStoreEmail } = await import("./message-payload-parser");

	const result = await parseAndStoreEmail(
		"Message-ID: <replayed@example.test>\nFrom: sender@example.test\nTo: owner@example.test\nSubject: Replay\n\nBody",
		{
			ownerId: "owner-1",
			workspaceId: "workspace-1",
			mailboxId: "mailbox-1",
			rawStorageKey: "raw/replayed.eml",
			emlKey: "replayed.eml",
		},
	);

	assert.equal(result, existingMessage);
	assert.deepEqual(redisLookups, []);
});
