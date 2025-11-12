import { MessageEntity } from "@db";
import { AddressObjectJSON } from "@schema";
import slugify from "@sindresorhus/slugify";

export const fromName = (message: MessageEntity) => {
	const from: AddressObjectJSON | string = message.from as any;

	if (!from) return null;

	if (typeof from === "string") {
		// string form has no display name, return just the email part before @ if you want
		return from.split("@")[0] ?? null;
	}

	// object form with parsed name
	return from.value?.[0]?.name ?? null;
};

export const fromAddress = (message: MessageEntity) => {
	const from: AddressObjectJSON = message.from as any;

	if (!from) return null;

	if (typeof from === "string") {
		return from;
	}

	// object form with parsed email
	return from.value?.[0]?.address ?? null;
};

export const getMessageName = (
	message: MessageEntity,
	field: "from" | "to" | "cc" | "bcc",
): string | null => {
	const value: AddressObjectJSON | string | null = (message as any)[field];

	if (!value) return null;

	if (typeof value === "string") {
		// string form has no display name; fallback to part before @
		const beforeAt = value.split("@")[0];
		return beforeAt || null;
	}

	// object form with parsed name
	return value.value?.[0]?.name ?? null;
};

export const getMessageAddress = (
	message: MessageEntity,
	field: "from" | "to" | "cc" | "bcc",
): string | null => {
	if (!message) {
		return "";
	}
	const value: AddressObjectJSON | string | null = (message as any)[field];

	if (!value) return null;

	if (typeof value === "string") {
		return value;
	}

	// object form with parsed email address
	return value.value?.[0]?.address ?? null;
};

export function sanitizeFilename(name: string): string {
	const dot = name.lastIndexOf(".");
	const base = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : "";

	// slugify ensures ASCII, strips unsafe chars, collapses spaces
	const cleanBase = slugify(base, {
		separator: "-", // or '_' if you prefer underscores
		decamelize: false, // keep as-is
		preserveLeadingUnderscore: true,
	});

	return (cleanBase || "attachment") + ext.toLowerCase();
}

export const encodeMailboxPath = (path: string) => {
	return encodeURIComponent(path).replaceAll("%2F", "~"); // keep nicer URLs
};

export const decodeMailboxPath = (slug: string) => {
	return decodeURIComponent(slug.replaceAll("~", "%2F"));
};
