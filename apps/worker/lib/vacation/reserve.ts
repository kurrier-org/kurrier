import { sql } from "drizzle-orm";
import { replyRecipient } from "./eligibility";

export async function reserveVacationReply(
	tx: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
	message: { id: string; mailboxId: string; headersJson: unknown },
	envelopeSender?: string,
	receivedAt = new Date(),
) {
	const headers = (message.headersJson ?? {}) as Record<string, unknown>;
	// Resolve the identity from the receiving inbox, never from caller-supplied IDs.
	const result = (await tx.execute(sql`
  SELECT s.*, i.value FROM vacation_settings s
  JOIN identities i ON i.id=s.identity_id AND i.workspace_id=s.workspace_id
  JOIN mailboxes m ON m.identity_id=i.id AND m.workspace_id=s.workspace_id
  WHERE m.id=${message.mailboxId} AND m.kind='inbox' AND s.enabled
  AND ${receivedAt.toISOString()}::timestamptz >= greatest(s.activated_at,coalesce(s.starts_at,s.activated_at))
  AND (s.ends_at IS NULL OR ${receivedAt.toISOString()}::timestamptz<s.ends_at)
 `)) as unknown as Array<{
		identity_id: string;
		workspace_id: string;
		period_id: string;
		value: string;
	}>;
	const settings = result[0];
	if (!settings) return;
	const recipient = replyRecipient(headers, settings.value, envelopeSender);
	if (!recipient) return;
	const ownAddress = (await tx.execute(
		sql`SELECT id FROM identities WHERE workspace_id=${settings.workspace_id} AND lower(value)=${recipient}`,
	)) as unknown as unknown[];
	if (ownAddress.length) return;
	await tx.execute(sql`
  INSERT INTO vacation_replies(identity_id,workspace_id,period_id,recipient,message_id)
  VALUES (${settings.identity_id},${settings.workspace_id},${settings.period_id},${recipient},${message.id})
  ON CONFLICT(identity_id,period_id,recipient) DO NOTHING
 `);
}
