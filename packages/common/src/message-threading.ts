import { createHash } from "node:crypto";

const ATOM = "[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+";
const DOT_ATOM = `${ATOM}(?:\\.${ATOM})*`;
const MESSAGE_ID_PATTERN = new RegExp(`^<${DOT_ATOM}@${DOT_ATOM}>$`);

export function normalizeMessageId(
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim();
	if (!normalized || /[\s:\r\n]/.test(normalized)) return null;
	return MESSAGE_ID_PATTERN.test(normalized) ? normalized : null;
}

export function extractThreadingHeader(
	rawEmail: string,
	headerName: string,
): string | null {
	const lines = rawEmail.split(/\r?\n/);
	const escapedName = headerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const headerPattern = new RegExp(`^${escapedName}:\\s*(.*)$`, "i");
	for (let index = 0; index < lines.length; index += 1) {
		if (lines[index] === "") break;
		const match = lines[index].match(headerPattern);
		if (!match) continue;
		const values = [match[1]];
		while (
			index + 1 < lines.length &&
			(lines[index + 1].startsWith(" ") || lines[index + 1].startsWith("\t"))
		) {
			index += 1;
			values.push(lines[index].trim());
		}
		return values.join(" ").trim();
	}
	return null;
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

export function parseThreadingReferences(
	value: string | null | undefined,
): string[] {
	return buildThreadingCandidates(null, value ? [value] : []);
}

export function selectThreadParent(
	inReplyTo: string | null | undefined,
	references: readonly (string | null | undefined)[],
	availableMessageIds: readonly string[],
): string | null {
	const replyCandidate = normalizeMessageId(inReplyTo);
	const referenceCandidates = Array.from(
		new Set(references.flatMap(extractMessageIds)),
	).reverse();
	const ordered = replyCandidate
		? [
				replyCandidate,
				...referenceCandidates.filter((id) => id !== replyCandidate),
			]
		: referenceCandidates;
	const available = new Set(availableMessageIds);
	return ordered.find((candidate) => available.has(candidate)) ?? null;
}

export function resolveMessageId(
	rawEmail: string,
	parsedMessageId: string | null | undefined,
	rawMessageId: string | null | undefined,
): string {
	return (
		normalizeMessageId(parsedMessageId) ??
		normalizeMessageId(rawMessageId) ??
		fallbackMessageId(rawEmail)
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
