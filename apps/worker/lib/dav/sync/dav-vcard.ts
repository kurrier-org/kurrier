import vCard from "vcf";
import { lookup as mimeLookup, extension as mimeExtension } from "mime-types";

export type ParsedContactFields = {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    emails?: any[] | null;
    phones?: any[] | null;
    addresses?: any[] | null;
    notes?: string | null;
    dob?: string | null;
    photo?: {
        type: string | null;
        mime: string | null;
        ext: string | null;
        base64?: string | null;
        url?: string | null;
    } | null;
};

function unescapeVCardValue(v: string): string {
    return v
        .replace(/\\\\/g, "\\")
        .replace(/\\n/gi, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";");
}

function normalizePhotoType(rawType: string | null): { mime: string | null; ext: string | null } {
    let mime: string | null = null;

    if (rawType) {
        const t = rawType.toLowerCase();
        const looked = mimeLookup(t);
        if (looked) {
            mime = looked as string;
        } else {
            switch (t) {
                case "jpeg":
                case "jpg":
                    mime = "image/jpeg";
                    break;
                case "png":
                    mime = "image/png";
                    break;
                case "gif":
                    mime = "image/gif";
                    break;
            }
        }
    }

    if (!mime) mime = "image/jpeg";

    let ext = mimeExtension(mime);
    if (!ext) ext = "jpg";

    return { mime, ext };
}

export function parseVCardToContact(raw: string): ParsedContactFields {
    const card = new (vCard as any)().parse(raw);
    const j = card.toJSON();
    const props: any[] = Array.isArray(j) && j[0] === "vcard" ? j[1] : [];

    const findFirst = (name: string) =>
        props.find((p) => String(p[0]).toLowerCase() === name.toLowerCase());
    const findAll = (name: string) =>
        props.filter((p) => String(p[0]).toLowerCase() === name.toLowerCase());

    let firstName: string | null = null;
    let lastName: string | null = null;
    let company: string | null = null;
    let jobTitle: string | null = null;
    const emails: any[] = [];
    const phones: any[] = [];
    const addresses: any[] = [];
    let notes: string | null = null;
    let dob: string | null = null;
    let photo: ParsedContactFields["photo"] = null;


    const nProp = findFirst("n");
    if (nProp) {
        const v = Array.isArray(nProp[3]) ? nProp[3] : [];
        const rawFamily = v[0] ? unescapeVCardValue(String(v[0])) : "";
        const rawGiven = v[1] ? unescapeVCardValue(String(v[1])) : "";
        const rawAdditional = v[2] ? unescapeVCardValue(String(v[2])) : "";

        if ((rawFamily === "\\" || rawFamily.trim() === "") && rawAdditional) {
            firstName = rawGiven || null;
            lastName = rawAdditional || null;
        } else {
            firstName = rawGiven || null;
            lastName = rawFamily || null;
        }
    }

    if (!firstName && !lastName) {
        const fnProp = findFirst("fn");
        if (fnProp) {
            const fnVal = unescapeVCardValue(String(fnProp[3] ?? "")).trim();
            if (fnVal) {
                const parts = fnVal.split(/\s+/);
                if (parts.length === 1) {
                    firstName = parts[0];
                } else {
                    firstName = parts.slice(0, -1).join(" ");
                    lastName = parts[parts.length - 1];
                }
            }
        }
    }

    const orgProp = findFirst("org");
    if (orgProp) {
        const v = orgProp[3];
        if (typeof v === "string") {
            company = v || null;
        } else if (Array.isArray(v) && v.length) {
            company = unescapeVCardValue(String(v[0]));
        }
    }

    const titleProp = findFirst("title");
    if (titleProp) {
        const v = String(titleProp[3] ?? "");
        jobTitle = v || null;
    }

    for (const p of findAll("email")) {
        const v = String(p[3] ?? "").trim();
        if (v) emails.push({ address: v });
    }

    for (const p of findAll("tel")) {
        const v = String(p[3] ?? "").trim();
        if (v) phones.push({ number: v, code: null });
    }


    for (const p of findAll("adr")) {
        const v = Array.isArray(p[3]) ? p[3] : [];
        const addr = {
            streetAddressLine2: v[1] || null,
            streetAddress: v[2] || null,
            city: v[3] || null,
            state: v[4] || null,
            code: v[5] || null,
            country: v[6] || null,
        };
        if (Object.values(addr).some((x) => x && String(x).trim().length)) {
            addresses.push(addr);
        }
    }


    const bdayProp = findFirst("bday");
    if (bdayProp) {
        const rawDob = String(bdayProp[3] ?? "").trim();
        if (/^\d{8}$/.test(rawDob)) {
            dob = `${rawDob.slice(0, 4)}-${rawDob.slice(4, 6)}-${rawDob.slice(6, 8)}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
            dob = rawDob;
        } else if (rawDob) {
            dob = rawDob;
        }
    }

    const noteProp = findFirst("note");
    if (noteProp) {
        const v = String(noteProp[3] ?? "");
        notes = v || null;
    }

    const photoProp = findFirst("photo");
    if (photoProp) {
        const params = (photoProp[1] || {}) as Record<string, any>;
        const encoding = (params.encoding ?? params.ENCODING ?? "")
            .toString()
            .toLowerCase() || null;
        const rawType = (params.type ?? params.TYPE ?? null) as string | null;
        const value = photoProp[3];

        const { mime, ext } = normalizePhotoType(rawType);

        if (encoding === "b" || encoding === "base64") {
            photo = {
                type: rawType,
                mime,
                ext,
                base64: typeof value === "string" ? value : null,
            };
        } else if (
            typeof value === "string" &&
            (value.startsWith("http://") || value.startsWith("https://"))
        ) {
            photo = {
                type: rawType,
                mime,
                ext,
                url: value,
            };
        }
    }

    return {
        firstName: firstName || "",
        lastName,
        company,
        jobTitle,
        emails: emails.length ? emails : [],
        phones: phones.length ? phones : [],
        addresses: addresses.length ? addresses : [],
        notes,
        dob,
        photo,
    };
}
