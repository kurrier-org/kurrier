import {
	db,
	contacts,
	addressBooks,
	davAccounts,
	secretsMeta,
	getSecretAdmin,
} from "@db";
import { and, desc, eq } from "drizzle-orm";
import DigestFetch from "digest-fetch";

export async function deleteContactViaHttp(opts: {
	davBaseUrl: string;
	username: string;
	password: string;
	collectionPath: string;
	davUri: string;
	etag?: string | null;
}) {
	const { davBaseUrl, username, password, collectionPath, davUri, etag } = opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const collection = collectionPath.replace(/^\//, "");
	const url = `${base}/${collection}/${encodeURIComponent(davUri)}`;

	const headers: Record<string, string> = {};
	if (etag) {
		headers["If-Match"] = `"${etag}"`;
	}

	let res = await digestFetch(url, {
		method: "DELETE",
		headers,
	});

	if (res.status === 412 && headers["If-Match"]) {
		delete headers["If-Match"];
		res = await digestFetch(url, {
			method: "DELETE",
			headers,
		});
	}

	if (res.status === 404) {
		return { success: true };
	}

	if (!(res.status === 200 || res.status === 204)) {
		const text = await res.text().catch(() => "");
		console.error(
			`CardDAV DELETE failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	return { success: true };
}

export const deleteContact = async (payload: {
	contactId: string;
	ownerId: string;
}) => {
	const { contactId, ownerId } = payload;

	const [contact] = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)));

	if (!contact) return;

	const [book] = await db
		.select()
		.from(addressBooks)
		.where(eq(addressBooks.ownerId, ownerId));

	if (!book || !book.davAccountId) {
		await db.delete(contacts).where(eq(contacts.id, contact.id));
		return { success: true };
	}

	if (!contact.davUri) {
		await db.delete(contacts).where(eq(contacts.id, contact.id));
		return { success: true };
	}

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

	if (!secretRow?.account) {
		await db.delete(contacts).where(eq(contacts.id, contact.id));
		return { success: true };
	}

	const secret = await getSecretAdmin(String(secretRow.metaId));
	const passwordFromSecret = secret?.vault?.decrypted_secret;

	if (!passwordFromSecret) {
		console.error(
			"No password found in secret for DAV account",
			book.davAccountId,
		);
		await db.delete(contacts).where(eq(contacts.id, contact.id));
		return { success: true };
	}

	const davUsername = secretRow.account.username;
	const collectionPath = `addressbooks/${davUsername}/${book.slug}`;

	await deleteContactViaHttp({
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: davUsername,
		password: passwordFromSecret,
		collectionPath,
		davUri: contact.davUri,
		etag: contact.davEtag,
	});

	await db.delete(contacts).where(eq(contacts.id, contact.id));

	return { success: true };
};
