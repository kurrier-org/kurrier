import {ContactEntity, AddressBookEntity} from "@db";
import {ParsedContactFields} from "./dav-vcard";
import { createSupabaseServiceClient } from "../../create-client-ssr";
import { nanoid } from "nanoid";
import { decode } from "base64-arraybuffer";

export async function davParsePhoto(parsed: ParsedContactFields, book: Partial<AddressBookEntity>, newContactPublicId: string, payload: Partial<ContactEntity>) {
    if (!parsed.photo) return;

    const supabase = await createSupabaseServiceClient();

    const basePath = `private/${book.ownerId}/contacts/${newContactPublicId}`;
    const ext = parsed.photo.ext; // ext is now "jpg", "png", etc.

    const mainPath = `${basePath}/${nanoid(12)}.${ext}`;
    const thumbPath = `${basePath}/${nanoid(12)}_xs.${ext}`;

    let mainFile

    if (parsed.photo?.base64) {
        mainFile = decode(parsed.photo.base64);
    } else if (parsed.photo.url) {
        const response = await fetch(parsed.photo.url);
        if (!response.ok) {
            console.error("Failed to fetch photo:", parsed.photo.url);
        } else {
            mainFile = Buffer.from(await response.arrayBuffer());
        }
    }

    if (mainFile) {
        const [mainRes, thumbRes] = await Promise.all([
            supabase.storage.from("attachments").upload(mainPath, mainFile),
            supabase.storage.from("attachments").upload(thumbPath, mainFile),
        ]);
        payload.profilePicture = mainRes.data?.path || null;
        payload.profilePictureXs = thumbRes.data?.path || null;
    }
}
