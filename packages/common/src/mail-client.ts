import { MessageEntity } from "@db";
import { AddressObjectJSON } from "@schema";
import slugify from "@sindresorhus/slugify";

export const fromName = (message: MessageEntity) => {
	const from: AddressObjectJSON | string = message.from as any;

	if (!from) return null;

	if (typeof from === "string") {
		return from.split("@")[0] ?? null;
	}

	return from.value?.[0]?.name ?? null;
};

export const fromAddress = (message: MessageEntity) => {
	const from: AddressObjectJSON = message.from as any;

	if (!from) return null;

	if (typeof from === "string") {
		return from;
	}

	return from.value?.[0]?.address ?? null;
};

export const getMessageName = (
	message: MessageEntity,
	field: "from" | "to" | "cc" | "bcc",
): string | null => {
	const value: AddressObjectJSON | string | null = (message as any)[field];

	if (!value) return null;

	if (typeof value === "string") {
		const beforeAt = value.split("@")[0];
		return beforeAt || null;
	}

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

	return value.value?.[0]?.address ?? null;
};

export function sanitizeFilename(name: string): string {
	const dot = name.lastIndexOf(".");
	const base = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : "";

	const cleanBase = slugify(base, {
		separator: "-",
		decamelize: false,
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

export const DEFAULT_COLORS_SWATCH = [
	"#2e2e2e",
	"#868e96",
	"#fa5252",
	"#e64980",
	"#be4bdb",
	"#7950f2",
	"#4c6ef5",
	"#228be6",
	"#15aabf",
	"#12b886",
	"#40c057",
	"#82c91e",
	"#fab005",
	"#fd7e14",
];

export const PAGE_SIZE = 50;
