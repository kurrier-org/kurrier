import {
	db,
	contacts,
	addressBooks,
	davAccounts,
	secretsMeta,
	getSecretAdmin,
	labels,
	contactLabels,
} from "@db";
import { and, desc, eq } from "drizzle-orm";
import DigestFetch from "digest-fetch";
import { buildVCard } from "./dav-build-card";
import { normalizeEtag } from "./sync/dav-sync-db";

export async function updateContactViaHttp(opts: {
	carddata: string;
	davBaseUrl: string;
	username: string;
	password: string;
	collectionPath: string;
	davUri: string;
	etag?: string | null;
}) {
	const {
		carddata,
		davBaseUrl,
		username,
		password,
		collectionPath,
		davUri,
		etag,
	} = opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const collection = collectionPath.replace(/^\//, "");
	const url = `${base}/${collection}/${encodeURIComponent(davUri)}`;

	const headers: Record<string, string> = {
		"Content-Type": "text/vcard; charset=utf-8",
	};

	const ifMatch = `"${etag}"`;
	if (ifMatch) {
		headers["If-Match"] = ifMatch;
	}

	let res = await digestFetch(url, {
		method: "PUT",
		headers,
		body: carddata,
	});

	if (res.status === 412 && headers["If-Match"]) {
		delete headers["If-Match"];
		res = await digestFetch(url, {
			method: "PUT",
			headers,
			body: carddata,
		});
	}

	if (!(res.status === 200 || res.status === 204)) {
		const text = await res.text().catch(() => "");
		console.error(
			`CardDAV PUT (update) failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	const newEtag = res.headers.get("etag") ?? null;
	return { etag: normalizeEtag(newEtag) };
}


// export const updateContact = async (contactId: string, ownerId: string) => {
export const pushUpdateContact = async (contactId: string, ownerId: string) => {
	const rows = await db
		.select({
			contact: contacts,
			labelName: labels.name,
			labelId: labels.id,
		})
		.from(contacts)
		.leftJoin(contactLabels, eq(contactLabels.contactId, contacts.id))
		.leftJoin(labels, eq(contactLabels.labelId, labels.id))
		.where(and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)));

	if (!rows.length) return null;

	const contact = rows[0].contact;
	if (!contact) return null;

	const labelItems = rows
		.filter((r) => r.labelName)
		.map((r) => String(r.labelName));

	const [book] = await db
		.select()
		.from(addressBooks)
		.where(
			and(eq(addressBooks.ownerId, ownerId)),
		)
		.limit(1);

	if (!book) return null;

	// 🔹 NEW: derive username from davAccountId (no remotePath anymore)
	const [secretRow] = await db
		.select({
			account: davAccounts,
			metaId: secretsMeta.id,
		})
		.from(davAccounts)
		.where(eq(davAccounts.id, book.davAccountId))
		.leftJoin(secretsMeta, eq(davAccounts.secretId, secretsMeta.id))
		.orderBy(desc(davAccounts.createdAt))
		.limit(1);

	if (!secretRow?.account) return null;

	const secret = await getSecretAdmin(String(secretRow.metaId));
	const passwordFromSecret = secret?.vault?.decrypted_secret;
	if (!passwordFromSecret) return null;

	const davUsername = secretRow.account.username;
	const collectionPath = `addressbooks/${davUsername}/${book.slug}`;

	const davUri = contact.davUri ?? `${contact.id}.vcf`;

	const carddata = await buildVCard(contact, labelItems);

	const { etag: newEtag } = await updateContactViaHttp({
		carddata,
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: davUsername,
		password: passwordFromSecret,
		collectionPath,
		davUri,
		etag: contact.davEtag,
	});

	await db
		.update(contacts)
		.set({
			davUri,
			davEtag: newEtag ?? contact.davEtag,
			updatedAt: new Date(),
		})
		.where(eq(contacts.id, contact.id));

	return { success: true };
};
