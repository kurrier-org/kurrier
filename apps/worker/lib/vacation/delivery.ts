import { db } from "@db";
import { sql } from "drizzle-orm";

export const vacationHeaders = {
	"Auto-Submitted": "auto-replied",
	"X-Auto-Response-Suppress": "All",
};

export async function deliverVacation(
	id: string,
	send: (
		payload: Record<string, unknown>,
		accepted: (providerId?: string) => Promise<void>,
		priorResponse?: { success: boolean; error?: string; MessageId?: string },
	) => Promise<{ success: boolean }>,
) {
	const rows = await db.execute(sql`
  UPDATE vacation_replies r SET status=CASE WHEN r.status='accepted' THEN 'reconciling' ELSE 'sending' END, attempted_at=now()
  FROM vacation_settings s
  WHERE r.id=${id} AND r.status IN ('pending','accepted') AND s.identity_id=r.identity_id
  AND s.workspace_id=r.workspace_id AND (r.status='accepted' OR (s.period_id=r.period_id AND s.enabled
  AND now() >= greatest(s.activated_at,coalesce(s.starts_at,s.activated_at))
  AND (s.ends_at IS NULL OR now()<s.ends_at)
  AND EXISTS (SELECT 1 FROM messages msg JOIN mailboxes box ON box.id=msg.mailbox_id
   WHERE msg.id=r.message_id AND box.identity_id=r.identity_id AND box.kind='inbox')))
  RETURNING r.*
 `);
	const reply = rows[0];
	if (!reply) return;
	try {
		if (reply.status === "reconciling") {
			const stored = await db.execute(
				sql`SELECT id FROM messages WHERE id=${id}`,
			);
			if (stored.length) {
				await db.execute(
					sql`UPDATE vacation_replies SET status='reconciled' WHERE id=${id}`,
				);
				return;
			}
		}
		const data = await db.execute(sql`
   SELECT s.subject,s.message,m.id AS sent_mailbox_id
   FROM vacation_settings s JOIN mailboxes m ON m.identity_id=s.identity_id AND m.workspace_id=s.workspace_id
   WHERE s.identity_id=${reply.identity_id} AND m.kind='sent'
  `);
		if (!data[0]) throw new Error("Vacation sender mailbox is unavailable");
		const payload = reply.payload ?? {
			apiMessageId: id,
			rfc822MessageId: `<vacation-${id}@kurrier.local>`,
			originalMessageId: reply.message_id,
			sentMailboxId: data[0].sent_mailbox_id,
			to: [reply.recipient],
			subject: data[0].subject,
			text: data[0].message,
			mode: "reply",
			attachments: "[]",
		};
		const result = await send(
			payload as Record<string, unknown>,
			async (providerId) => {
				await db.execute(
					sql`UPDATE vacation_replies SET status='accepted',payload=${JSON.stringify(payload)}::jsonb,provider_message_id=${providerId ?? null} WHERE id=${id}`,
				);
			},
			reply.status === "reconciling"
				? { success: true, MessageId: String(reply.provider_message_id ?? "") }
				: undefined,
		);
		if (!result.success) throw new Error("Vacation delivery failed");
		await db.execute(
			sql`UPDATE vacation_replies SET status='reconciled' WHERE id=${id}`,
		);
	} catch (error) {
		// An adapter may have submitted the message before throwing. Never blindly resend.
		await db.execute(
			sql`UPDATE vacation_replies SET status='unknown' WHERE id=${id} AND status='sending'`,
		);
		await db.execute(
			sql`UPDATE vacation_replies SET status='accepted' WHERE id=${id} AND status='reconciling'`,
		);
		console.error("[vacation] delivery requires inspection", {
			replyId: id,
			error: error instanceof Error ? error.message : "Delivery failed",
		});
	}
}

export async function dispatchVacation(queue: {
	add: (name: string, data: unknown, opts: object) => Promise<unknown>;
}) {
	await db.execute(sql`UPDATE vacation_replies SET status=CASE WHEN status='sending' THEN 'unknown' ELSE 'accepted' END
        WHERE status IN ('sending','reconciling') AND attempted_at < now()-interval '15 minutes'`);
	await db.execute(sql`
  UPDATE vacation_replies r SET status='cancelled' WHERE r.status='pending'
  AND NOT EXISTS (SELECT 1 FROM vacation_settings s WHERE s.identity_id=r.identity_id
   AND s.period_id=r.period_id AND s.enabled AND (s.ends_at IS NULL OR s.ends_at>now()))
 `);
	const pending = await db.execute(
		sql`SELECT id FROM vacation_replies WHERE status IN ('pending','accepted') ORDER BY created_at LIMIT 100`,
	);
	for (const row of pending) {
		await queue.add(
			"send-vacation-reply",
			{ replyId: row.id },
			{
				jobId: String(row.id),
				removeOnComplete: true,
				removeOnFail: true,
			},
		);
	}
}
