import { AddressObjectJSON } from "./types/mail";
import { MessageEntity } from "@db";
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


// export const generateSnippet = (text: string) => {
//     if (!text) return null;
//     return text.toString()
//         .replace(/\s+/g, " ")
//         .slice(0, 100)
// };
//
//
// export function buildParticipantsSnapshot(msg: MessageEntity) {
//     const extract = (addrObj?: AddressObjectJSON | null) =>
//         (addrObj?.value ?? [])
//             .map((a) => ({
//                 n: a?.name || null,
//                 e: a?.address || null,
//             }))
//             .filter((x) => x.e)
//             .slice(0, 5);
//
//     return {
//         from: extract(msg.from),
//         to: extract(msg.to),
//         cc: extract(msg.cc),
//         bcc: extract(msg.bcc),
//     };
// }
