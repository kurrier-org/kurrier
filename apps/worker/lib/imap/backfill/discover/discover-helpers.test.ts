import assert from "node:assert/strict";
import test from "node:test";
import { createParentMailboxValues } from "./discover-helpers";

test("creates a missing IMAP parent mailbox in the identity workspace", () => {
	const workspaceId = "11111111-1111-4111-8111-111111111111";
	const values = createParentMailboxValues({
		identity: {
			id: "22222222-2222-4222-8222-222222222222",
			ownerId: "33333333-3333-4333-8333-333333333333",
			workspaceId,
		},
		parentPath: "INBOX",
		parentId: null,
		delimiter: ".",
	});

	assert.equal(values.workspaceId, workspaceId);
	assert.equal(values.identityId, "22222222-2222-4222-8222-222222222222");
	assert.equal(values.metaData.imap.path, "INBOX");
	assert.equal(values.metaData.imap.selectable, false);
});
