import {
    AddressBookEntity,
    addressBooks,
    ContactEntity,
    contacts,
    db
} from "@db";
import { eq } from "drizzle-orm";
import { davCards, DavCardsEntity, davDb } from "../dav-schema";
import { parseVCardToContact } from "./dav-vcard";
import { nanoid } from "nanoid";
import { davParsePhoto } from "./dav-profile-image";


const fetchContactData = async (card: DavCardsEntity) => {
    const vcardBytes = card.carddata as Uint8Array;
    return Buffer.from(vcardBytes).toString("utf8")
};

const createContact = async ({ card, book}: {
    card: DavCardsEntity;
    book: AddressBookEntity;
}) => {
    const parsed = parseVCardToContact(await fetchContactData(card));


    const newContactPublicId = nanoid(10)
    const payload = {
        ownerId: book.ownerId,
        addressBookId: book.id,
        publicId: newContactPublicId,
        ...parsed,
    } as ContactEntity
    await davParsePhoto(parsed, book, newContactPublicId, payload);

    payload.davUri = card.uri;
    payload.davEtag = normalizeEtag(card.etag);

    const [inserted] = await db
        .insert(contacts)
        .values(payload)
        .returning();

    return inserted

};


const updateContact = async ({card, book, localContact}: {
    card: DavCardsEntity;
    book: AddressBookEntity;
    localContact: ContactEntity;
}) => {
    const parsed = parseVCardToContact(await fetchContactData(card));

    const payload = {
        ownerId: book.ownerId,
        addressBookId: book.id,
        ...parsed,
    } as ContactEntity
    await davParsePhoto(parsed, book, localContact.publicId, payload);


    payload.davUri = card.uri;
    payload.davEtag = normalizeEtag(card.etag);

    const [contact] = await db
        .update(contacts)
        .set(payload)
        .where(eq(contacts.id, localContact.id)).returning();

    return contact

};


const syncBook = async (book: AddressBookEntity) => {
    const parts = book.remotePath.split("/");
    if (parts.length !== 3 || parts[0] !== "addressbooks") return;

    const cards = await davDb.select().from(davCards)
    const remoteUris = new Set<string>();

    for (const card of cards) {
        remoteUris.add(card.uri);

        const [localContact] = await db.select().from(contacts).where(eq(
            contacts.davUri, card.uri
        ))
        if (localContact){
            if (card.etag !== localContact.davEtag) {
                await updateContact({card, book, localContact})
            }
        } else {
            console.info("[DAV SYNC] New contact from DAV:", card.uri);
            await createContact({card, book})
        }
    }


    const localContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.addressBookId, book.id));

    const deletedIds: string[] = [];


    for (const local of localContacts) {
        if (local.davUri && !remoteUris.has(local.davUri)) {
            await db.delete(contacts).where(eq(contacts.id, local.id));
            deletedIds.push(String(local.id));
        }
    }


    if (deletedIds.length) {
        console.info("[DAV SYNC] Deleted local contacts removed remotely:", {
            count: deletedIds.length,
            ids: deletedIds
        });
    }
};


export const davSyncDb = async () => {
    const books = await db
        .select()
        .from(addressBooks)
        .where(eq(addressBooks.isDefault, true));

    if (!books.length) {
        console.info("[DAV SYNC] No DAV books found.");
        return;
    }


    for (const book of books) {
        try {
            await syncBook(book as AddressBookEntity);
        } catch (err: any) {
            console.error(
                "[DAV SYNC] Error syncing book",
                book.id,
                err?.message ?? err
            );
        }
    }

    console.info("[DAV SYNC] Completed.");

};



export function normalizeEtag(etag?: string | null): string | null {
    if (!etag) return null;
    let e = etag.trim();
    if (e.startsWith('"') && e.endsWith('"')) {
        e = e.slice(1, -1);
    }
    const weak = e.match(/^W\/"(.+)"$/);
    if (weak) {
        return weak[1];
    }
    return e.replace(/^W\//, "").replace(/"/g, "");
}
