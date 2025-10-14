import { ImapFlow } from "imapflow";
import { db, identities } from "@db";
import { eq } from "drizzle-orm";
import { syncMailboxEntities } from "../../lib/imap/imap-backfill";

export const backfillMailboxes = async (
	client: ImapFlow,
	identityId: string,
) => {
	try {
		const [identity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, identityId));
		if (!identity) return;
		await syncMailboxEntities(client, identity);
	} catch (err) {
		console.error("Backfill error", err);
	}
};
