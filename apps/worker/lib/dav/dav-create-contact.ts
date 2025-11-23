import { db, contacts, addressBooks, davAccounts, secretsMeta, getSecretAdmin } from "@db";
import { and, desc, eq } from "drizzle-orm";
import DigestFetch from "digest-fetch";
import { buildVCard } from "./dav-build-card";


export async function createContactViaHttp(opts: {
    carddata: string;
    davBaseUrl: string;
    username: string;
    password: string;
    collectionPath: string;
    davUri: string;
}) {
    const {
        carddata,
        davBaseUrl,
        username,
        password,
        collectionPath,
        davUri,
    } = opts;

    const client = new DigestFetch(username, password);
    const digestFetch = client.fetch.bind(client);

    const base = davBaseUrl.replace(/\/$/, "");
    const collection = collectionPath.replace(/^\//, "");
    const url = `${base}/${collection}/${encodeURIComponent(davUri)}`;

    const res = await digestFetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "text/vcard; charset=utf-8",
            "If-None-Match": "*",
        },
        body: carddata,
    });

    if (!(res.status === 200 || res.status === 201 || res.status === 204)) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `CardDAV PUT failed (${res.status} ${res.statusText}): ${text}`,
        );
    }

    const etag = res.headers.get("etag") ?? null;
    return { etag };
}

export const createContact = async (contactId: string, ownerId: string) => {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)));

    if (!contact) return

    const [book] = await db
        .select()
        .from(addressBooks)
        .where(
            and(
                eq(addressBooks.ownerId, ownerId),
                eq(addressBooks.isDefault, true),
            ),
        );

    if (!book) return
    const parts = book.remotePath.split("/");
    if (parts.length !== 3 || parts[0] !== "addressbooks") return

    const davUsername = parts[1];

    const carddata = await buildVCard(contact);

    const [secretRow] = await db.select({
            account: davAccounts,
            metaId: secretsMeta.id,
        })
        .from(davAccounts)
        .where(eq(davAccounts.id, book.davAccountId))
        .leftJoin(secretsMeta, eq(davAccounts.secretId, secretsMeta.id))
        .orderBy(desc(davAccounts.createdAt))

    const secret = await getSecretAdmin(String(secretRow?.metaId));
    const passwordFromSecret = secret?.vault?.decrypted_secret;
    if (!passwordFromSecret) {
        console.error("No password found in secret for DAV account", book.davAccountId);
        return
    }

    const davUri = `${contact.id}.vcf`;
    const { etag } = await createContactViaHttp({
        carddata,
        davBaseUrl: `${process.env.DAV_URL}/dav.php`,
        username: davUsername,
        password: passwordFromSecret,
        collectionPath: book.remotePath,
        davUri,
    });

    await db
        .update(contacts)
        .set({
            davUri,
            davEtag: etag,
            updatedAt: new Date(),
        })
        .where(eq(contacts.id, contact.id));



    return { success: true }
};
