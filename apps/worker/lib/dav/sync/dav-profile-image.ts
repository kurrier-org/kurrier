import { ContactEntity, AddressBookEntity } from "@db";
import { ParsedContactFields } from "./dav-vcard";
import { nanoid } from "nanoid";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {s3} from "../../../lib/create-s3-client";


export async function davParsePhoto(
	parsed: ParsedContactFields,
	book: Partial<AddressBookEntity>,
	newContactPublicId: string,
	payload: Partial<ContactEntity>,
) {
	if (!parsed.photo) return;

	const basePath = `private/${book.ownerId}/contacts/${newContactPublicId}`;
	const ext = parsed.photo.ext;

	const mainPath = `${basePath}/${nanoid(12)}.${ext}`;
	const thumbPath = `${basePath}/${nanoid(12)}_xs.${ext}`;

	let mainFile: Buffer | undefined;

	if (parsed.photo?.base64) {
		mainFile = Buffer.from(parsed.photo.base64, "base64");
	} else if (parsed.photo.url) {
		const response = await fetch(parsed.photo.url);
		if (response.ok) {
			mainFile = Buffer.from(await response.arrayBuffer());
		}
	}

	if (!mainFile) return;

	const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

	await Promise.all([
		s3.send(new PutObjectCommand({
			Bucket: process.env.S3_BUCKET!,
			Key: mainPath,
			Body: mainFile,
			ContentType: contentType,
		})),
		s3.send(new PutObjectCommand({
			Bucket: process.env.S3_BUCKET!,
			Key: thumbPath,
			Body: mainFile,
			ContentType: contentType,
		})),
	]);

	payload.profilePicture = mainPath;
	payload.profilePictureXs = thumbPath;
}
