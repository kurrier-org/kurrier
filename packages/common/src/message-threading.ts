import { createHash } from "node:crypto";

const MESSAGE_ID_PATTERN = /<[^<>\s@]+@[^<>\s@]+>/g;

export function normalizeMessageId(
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim();
	if (!normalized) return null;
	const matches = normalized.match(MESSAGE_ID_PATTERN);
	return matches?.length === 1 && matches[0] === normalized ? matches[0] : null;
}

function extractMessageIds(value: string | null | undefined): string[] {
	if (!value) return [];
	const matches = value.match(MESSAGE_ID_PATTERN);
	return matches ?? [];
}

export function buildThreadingCandidates(
	inReplyTo: string | null | undefined,
	references: readonly (string | null | undefined)[],
): string[] {
	return Array.from(
		new Set([inReplyTo, ...references].flatMap(extractMessageIds)),
	);
}

export function fallbackMessageId(rawEmail: string): string {
	return `<kurrier-${createHash("sha256").update(rawEmail).digest("hex")}@invalid>`;
}

export function deduplicateThreadMessages<
	T extends { messageId: string; mailboxId: string },
>(messages: readonly T[], activeMailboxId: string): T[] {
	const byMessageId = new Map<string, T>();
	for (const message of messages) {
		const current = byMessageId.get(message.messageId);
		if (!current || message.mailboxId === activeMailboxId) {
			byMessageId.set(message.messageId, message);
		}
	}
	return Array.from(byMessageId.values());
}
