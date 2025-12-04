import { ImapFlow } from "imapflow";

export type ImapBox = Awaited<ReturnType<ImapFlow["list"]>>[number];

export function isGmailAccountFromBoxes(boxes: ImapBox[]): boolean {
	return boxes.some(
		(b) =>
			b.path.startsWith("[Gmail]") ||
			(typeof b.specialUse === "string" &&
				b.specialUse.toLowerCase() === "\\all"),
	);
}

export function shouldSyncBox(box: ImapBox, isGmail: boolean): boolean {
	if (!box.listed) return false;
	if (box.flags?.has("\\Noselect")) return false;

	const path = box.path.toLowerCase();
	const su = (box.specialUse as string | undefined)?.toLowerCase() ?? "";

	if (isGmail) {
		if (su === "\\all") return false;
		if (path === "[gmail]") return false;
		if (path === "[gmail]/important") return false;
		if (path === "[gmail]/notes") return false;
		if (path === "notes") return false;
	}

	return true;
}
