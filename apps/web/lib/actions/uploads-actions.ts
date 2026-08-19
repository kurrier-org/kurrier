"use server"


import {isSignedIn} from "@/lib/actions/auth";
import {getServerEnv} from "@schema";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {s3} from "@/lib/create-s3-client";
import {messages} from "@db";
import {eq} from "drizzle-orm";
import {rlsClient} from "@/lib/actions/clients";

export async function createAttachmentUploadUrl(input: {
    fileName: string;
    contentType: string;
    messageId: string;
}) {
    const user = await isSignedIn();
    if (!user) throw new Error("Unauthorized");
    const { S3_BUCKET } = getServerEnv();

    const ext = input.fileName.includes(".")
        ? input.fileName.split(".").pop()
        : "";

    const key = `private/${user.id}/${input.messageId}/${crypto.randomUUID()}${
        ext ? `.${ext}` : ""
    }`;

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET!,
        Key: key,
        ContentType: input.contentType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 300,
    });

    return {
        uploadUrl,
        key,
    };
}


export async function createAttachmentDownloadUrl(path: string) {
    const user = await isSignedIn();
    if (!user) throw new Error("Unauthorized");
    const { S3_BUCKET } = getServerEnv();
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET!,
        Key: path,
    });

    const url = await getSignedUrl(s3, command, {
        expiresIn: 300,
    });

    return { url };
}

export async function getRawMessageDownloadUrl(messageId: string) {
    const rls = await rlsClient();
    const [message] = await rls((tx) =>
        tx
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1),
    );
    if (!message?.rawStorageKey) {
        return { url: null };
    }
    const { S3_BUCKET } = getServerEnv();
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET!,
        Key: message.rawStorageKey,
    });
    const url = await getSignedUrl(s3, command, {
        expiresIn: 300,
    });
    return { url };
}



export async function uploadContactProfileAction(params: {
    mainFile: File;
    thumbFile: File;
    mainPath: string;
    thumbPath: string;
}) {
    const { mainFile, thumbFile, mainPath, thumbPath } = params;

    const mainBuffer = Buffer.from(await mainFile.arrayBuffer());
    const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer());

    await Promise.all([
        s3.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: mainPath,
                Body: mainBuffer,
                ContentType: mainFile.type,
            })
        ),
        s3.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: thumbPath,
                Body: thumbBuffer,
                ContentType: thumbFile.type,
            })
        ),
    ]);

    return { success: true };
}
