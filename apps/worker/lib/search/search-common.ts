import { ToSearchDocInput } from "@schema";
import type { AddressObjectJSON, EmailAddressJSON } from "@schema";

export const uniq = <T>(arr: T[]) => [...new Set(arr)];

export function normalizeEmail(e?: string | null): string | null {
	if (!e) return null;
	return (
		String(e)
			.trim()
			.toLowerCase()
			.replace(/[<>\s]+/g, "") || null
	);
}

export function flattenEmails(list?: EmailAddressJSON[]): string[] {
	if (!list?.length) return [];
	const out: string[] = [];
	for (const item of list) {
		if (item.address) out.push(item.address);
		if (item.group?.length) out.push(...flattenEmails(item.group));
	}
	return out;
}

export function emailsFromAddressObj(obj?: AddressObjectJSON | null): string[] {
	if (!obj) return [];
	return flattenEmails(obj.value);
}

export function collectParticipants(
	from: AddressObjectJSON | null,
	to: AddressObjectJSON | null,
	cc: AddressObjectJSON | null,
	bcc: AddressObjectJSON | null,
): string[] {
	const candidates = [
		...emailsFromAddressObj(from),
		...emailsFromAddressObj(to),
		...emailsFromAddressObj(cc),
		...emailsFromAddressObj(bcc),
	]
		.map(normalizeEmail)
		.filter((x): x is string => Boolean(x));
	return uniq(candidates);
}

export function emailDomain(email?: string | null) {
	if (!email) return "";
	const m = String(email)
		.toLowerCase()
		.match(/@([^> ]+)/);
	return m?.[1] ?? "";
}

export function toSearchDoc(
	msg: ToSearchDocInput & {
		threadPreview?: string | null;
		threadLastActivityAt?: Date | string | null;
		threadParticipants?: {
			from?: { n?: string | null; e: string }[];
			to?: { n?: string | null; e: string }[];
			cc?: { n?: string | null; e: string }[];
			bcc?: { n?: string | null; e: string }[];
		} | null;
		threadStarred?: boolean | null;
	},
) {
	const participantsFromThread = msg.threadParticipants
		? uniq(
				[
					...(msg.threadParticipants.from ?? []).map((x) =>
						normalizeEmail(x.e),
					),
					...(msg.threadParticipants.to ?? []).map((x) => normalizeEmail(x.e)),
					...(msg.threadParticipants.cc ?? []).map((x) => normalizeEmail(x.e)),
					...(msg.threadParticipants.bcc ?? []).map((x) => normalizeEmail(x.e)),
				].filter(Boolean) as string[],
			)
		: null;

	const participants = participantsFromThread?.length
		? participantsFromThread
		: collectParticipants(
				msg.from ?? null,
				msg.to ?? null,
				msg.cc ?? null,
				msg.bcc ?? null,
			);

	const fromEmail = (msg.fromEmail ?? "").toLowerCase();
	const createdAtMs = msg.createdAt
		? new Date(msg.createdAt).getTime()
		: Date.now();
	const lastInThreadAtMs = msg.threadLastActivityAt
		? new Date(msg.threadLastActivityAt).getTime()
		: msg.lastInThreadAt
			? new Date(msg.lastInThreadAt).getTime()
			: createdAtMs;

	const snippet =
		(msg.threadPreview ?? "").trim() || (msg.text ?? "").slice(0, 200);

	return {
		id: msg.id,
		ownerId: msg.ownerId,
		mailboxId: msg.mailboxId,
		threadId: msg.threadId,

		subject: msg.subject ?? "",
		snippet,
		text: msg.text ?? "",
		html: msg.html ?? "",

		fromName: msg.fromName ?? "",
		fromEmail,
		fromDomain: emailDomain(fromEmail),

		participants,
		labels: (msg.labels ?? []).map((l) => l.toLowerCase()),

		hasAttachment: msg.hasAttachments ? 1 : 0,
		unread: msg.seen ? 0 : 1,
		sizeBytes: Number(msg.sizeBytes ?? 0),

		starred: msg.threadStarred ? 1 : 0,

		createdAt: createdAtMs,
		lastInThreadAt: lastInThreadAtMs,
	};
}
