import { Buffer } from "node:buffer";
import { lookup } from "mime-types";
import { ContactEntity } from "@db";
import { createSupabaseServiceClient } from "../create-client-ssr";
import { getCountryDataList } from "countries-list";

function escapeVCardValue(value: string) {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\n/g, "\\n")
		.replace(/,/g, "\\,")
		.replace(/;/g, "\\;");
}

const countryData = getCountryDataList();
const phoneByCountry = new Map<string, string>(
	countryData.map((c) => [c.iso2, String(c.phone).split(",")[0].trim()]),
);

async function addPhotoToVCard(lines: string[], contact: ContactEntity) {
	if (!contact.profilePicture) return;
	const path = String(contact.profilePicture);
	const supabase = await createSupabaseServiceClient();
	const { data, error } = await supabase.storage
		.from("attachments")
		.download(path);
	if (error || !data) {
		console.error("Failed to download profile picture", error);
		return;
	}
	let buffer: Buffer;

	if (typeof (data as any).arrayBuffer === "function") {
		const ab = await (data as any).arrayBuffer();
		buffer = Buffer.from(ab);
	} else {
		const chunks: Buffer[] = [];
		for await (const chunk of data as any) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}
		buffer = Buffer.concat(chunks);
	}
	const base64 = buffer.toString("base64");
	const mime = lookup(contact.profilePicture);
	lines.push(`PHOTO;ENCODING=b;TYPE=${mime}:${base64}`);
}

export async function buildVCard(
	contact: ContactEntity,
	labelItems?: (string | null)[],
) {
	const lines: string[] = [];

	const fn = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
	const nParts = [contact.lastName ?? "", contact.firstName ?? "", "", "", ""];
	lines.push("BEGIN:VCARD");
	lines.push("VERSION:3.0");
	lines.push(`FN:${escapeVCardValue(fn)}`);
	lines.push(`N:${nParts.map(escapeVCardValue).join(";")}`);
	if (contact.company || contact.department) {
		const orgParts = [contact.company ?? "", contact.department ?? ""];
		lines.push(`ORG:${orgParts.map(escapeVCardValue).join(";")}`);
	}

	if (contact.jobTitle) {
		lines.push(`TITLE:${escapeVCardValue(contact.jobTitle)}`);
	}
	if (contact.emails?.length) {
		for (const e of contact.emails) {
			if (!e.address) continue;
			lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(e.address)}`);
		}
	}
	if (contact.phones?.length) {
		for (const p of contact.phones) {
			if (!p.number) continue;
			let fullNumber = p.number;

			if (p.code) {
				const dial = phoneByCountry.get(p.code.toUpperCase());
				if (dial) {
					fullNumber = `+${dial}${p.number}`;
				} else {
					fullNumber = `${p.code}${p.number}`;
				}
			}
			lines.push(`TEL;TYPE=CELL:${escapeVCardValue(fullNumber)}`);
		}
	}
	if (contact.addresses?.length) {
		for (const a of contact.addresses) {
			const adrParts = [
				"",
				a.streetAddressLine2 ?? "",
				a.streetAddress ?? "",
				a.city ?? "",
				a.state ?? "",
				a.code ?? "",
				a.country ?? "",
			];

			lines.push(`ADR;TYPE=HOME:${adrParts.map(escapeVCardValue).join(";")}`);
		}
	}
	if (contact.dob) {
		const compactDob = contact.dob.replace(/-/g, "");
		lines.push(`BDAY:${compactDob}`);
	}
	if (contact.notes) {
		lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
	}

	await addPhotoToVCard(lines, contact);
	if (labelItems?.length) {
		lines.push(`CATEGORIES:${labelItems.join(",")}`);
	}
	lines.push(`UID:${contact.id}`);
	lines.push("END:VCARD");
	return lines.join("\r\n");
}
