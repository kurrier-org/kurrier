// @ts-nocheck
import { db, identities, mailboxes, mailboxThreads, messages } from "@db";
import { and, desc, eq, sql } from "drizzle-orm";
import { AddressObjectJSON } from "@schema";
import { PgTransaction } from "drizzle-orm/pg-core";

type Mini = { n?: string | null; e: string | null };

export const generateSnippet = (text: string) =>
	text ? text.toString().replace(/\s+/g, " ").slice(0, 100) : null;

export function buildParticipantsSnapshot(msg: typeof messages.$inferSelect) {
	const extract = (addrObj?: AddressObjectJSON | null) =>
		(addrObj?.value ?? [])
			.map((a) => ({ n: a?.name || null, e: a?.address || null }))
			.filter((x) => x.e)
			.slice(0, 5);

	return {
		from: extract(msg.from),
		to: extract(msg.to),
		cc: extract(msg.cc),
		bcc: extract(msg.bcc),
	};
}

/**
 * Upsert (thread_id, mailbox_id) summary into mailbox_threads.
 * Aggregation is **scoped to this mailbox** so Inbox and Sent can each
 * have their own row linked to the same thread_id.
 */
export async function upsertMailboxThreadItem(
	messageId: string,
	tx?: PgTransaction,
) {
	const dbh = tx ?? db;

	// 1) Load the message + its mailbox/identity
	const [msg] = await dbh
		.select()
		.from(messages)
		.where(eq(messages.id, messageId));
	if (!msg) throw new Error(`Message ${messageId} not found`);

	const [mbx] = await dbh
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.id, msg.mailboxId));
	if (!mbx) throw new Error(`Mailbox ${msg.mailboxId} not found`);

	const [ident] = await dbh
		.select()
		.from(identities)
		.where(eq(identities.id, mbx.identityId));
	if (!ident) throw new Error(`Identity ${mbx.identityId} not found`);

	// 2) Pull all messages of this thread that **belong to this mailbox**
	const rows = await dbh
		.select({
			id: messages.id,
			subject: messages.subject,
			text: messages.text,
			html: messages.html,
			snippet: messages.snippet,
			seen: messages.seen,
			answered: messages.answered,
			flagged: messages.flagged,
			hasAttachments: messages.hasAttachments,
			from: messages.from,
			to: messages.to,
			cc: messages.cc,
			bcc: messages.bcc,
			date: messages.date,
			createdAt: messages.createdAt,
		})
		.from(messages)
		.where(
			and(
				eq(messages.ownerId, msg.ownerId),
				eq(messages.threadId, msg.threadId),
				eq(messages.mailboxId, mbx.id), // mailbox-scoped summary
			),
		)
		.orderBy(desc(sql`coalesce(${messages.date}, ${messages.createdAt})`));

	// There should be at least the triggering message
	if (rows.length === 0) {
		// Defensive: if nothing found (race?), create a degenerate row based on the single msg
		rows.push({
			id: msg.id,
			subject: msg.subject,
			text: msg.text,
			html: msg.html,
			snippet: msg.snippet,
			seen: msg.seen,
			answered: msg.answered,
			flagged: msg.flagged,
			hasAttachments: msg.hasAttachments,
			from: msg.from,
			to: msg.to,
			cc: msg.cc,
			bcc: msg.bcc,
			date: msg.date,
			createdAt: msg.createdAt,
		} as any);
	}

	// 3) Compute mailbox-scoped rollup
	const newest = rows[0];
	const oldest = rows[rows.length - 1];

	const subject = (newest.subject ?? "").trim() || "(no subject)";
	const previewText =
		newest.snippet ?? generateSnippet(newest.text || newest.html || "") ?? null;

	const coalesceDate = (r: typeof newest) => r.date ?? r.createdAt;
	const lastActivityAt = coalesceDate(newest);
	const firstMessageAt = coalesceDate(oldest);

	const messageCount = rows.length;
	const unreadCount = rows.reduce((acc, r) => acc + (r.seen ? 0 : 1), 0);
	const hasAttachments = rows.some((r) => r.hasAttachments);
	const starred = rows.some((r) => r.flagged);

	// participants: take first 5 per bucket from *this mailbox's* messages (recent-first)
	const participants: {
		from: Mini[];
		to: Mini[];
		cc: Mini[];
		bcc: Mini[];
	} = { from: [], to: [], cc: [], bcc: [] };

	const seenAddr = {
		from: new Set<string>(),
		to: new Set<string>(),
		cc: new Set<string>(),
		bcc: new Set<string>(),
	};

	for (const r of rows) {
		const snap = buildParticipantsSnapshot(r as any);
		(["from", "to", "cc", "bcc"] as const).forEach((k) => {
			if (participants[k].length >= 5) return;
			for (const p of snap[k]) {
				const email = (p.e || "").toLowerCase();
				if (!email || seenAddr[k].has(email)) continue;
				seenAddr[k].add(email);
				participants[k].push({ n: p.n ?? null, e: p.e ?? null });
				if (participants[k].length >= 5) break;
			}
		});
		if (
			participants.from.length >= 5 &&
			participants.to.length >= 5 &&
			participants.cc.length >= 5 &&
			participants.bcc.length >= 5
		)
			break;
	}

	// 4) Build row for mailbox_threads
	const payload = {
		threadId: msg.threadId,
		mailboxId: mbx.id,

		ownerId: mbx.ownerId,
		identityId: mbx.identityId,

		identityPublicId: ident.publicId,
		mailboxSlug: mbx.slug,

		subject,
		previewText,

		lastActivityAt,
		firstMessageAt,

		messageCount,
		unreadCount,

		hasAttachments,
		starred,

		participants, // JSONB
		updatedAt: new Date(),
	};

	// 5) Upsert on (thread_id, mailbox_id)
	await dbh
		.insert(mailboxThreads)
		.values(payload as any)
		.onConflictDoUpdate({
			target: [mailboxThreads.threadId, mailboxThreads.mailboxId],
			set: {
				// prefer new subject/preview if supplied
				subject: sql`COALESCE(EXCLUDED.subject, ${mailboxThreads.subject})`,
				previewText: sql`COALESCE(EXCLUDED.preview_text, ${mailboxThreads.previewText})`,

				// timeline
				lastActivityAt: sql`GREATEST(EXCLUDED.last_activity_at, ${mailboxThreads.lastActivityAt})`,
				firstMessageAt: sql`LEAST(COALESCE(EXCLUDED.first_message_at, ${mailboxThreads.firstMessageAt}), ${mailboxThreads.firstMessageAt})`,

				// counts from fresh aggregation
				messageCount: sql`EXCLUDED.message_count`,
				unreadCount: sql`EXCLUDED.unread_count`,

				// booleans accumulate
				hasAttachments: sql`${mailboxThreads.hasAttachments} OR EXCLUDED.has_attachments`,
				starred: sql`${mailboxThreads.starred} OR EXCLUDED.starred`,

				// shallow-merge participants (keeps existing keys, fills new)
				participants: sql`jsonb_strip_nulls(${mailboxThreads.participants} || EXCLUDED.participants)`,

				// ids/slugs are stable but keep them consistent
				identityId: sql`EXCLUDED.identity_id`,
				identityPublicId: sql`EXCLUDED.identity_public_id`,
				mailboxSlug: sql`EXCLUDED.mailbox_slug`,

				updatedAt: sql`now()`,
			},
		});

	return { threadId: msg.threadId, mailboxId: mbx.id };
}
