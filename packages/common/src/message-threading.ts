import { createHash } from "node:crypto";

const MESSAGE_ID_PATTERN = /^<[^<>\s@]+@[^<>\s@]+>$/;

export function normalizeMessageId(
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim();
	if (!normalized) return null;
	return MESSAGE_ID_PATTERN.test(normalized) ? normalized : null;
}

function extractMessageIds(value: string | null | undefined): string[] {
	if (!value?.trim()) return [];
	const ids = value.trim().split(/\s+/).map(normalizeMessageId);
	return ids.every((id): id is string => id !== null) ? ids : [];
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
