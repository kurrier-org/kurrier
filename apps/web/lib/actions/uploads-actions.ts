"use server"


import {isSignedIn} from "@/lib/actions/auth";
import {getPublicEnv, getServerEnv} from "@schema";
import {DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {s3} from "@/lib/create-s3-client";
import {emailAssets, messages} from "@db";
import {eq} from "drizzle-orm";
import {getWorkspaceId, rlsClient} from "@/lib/actions/clients";

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


const allowedEmailAssetTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
]);

const maxEmailAssetSize = 5 * 1024 * 1024;

const assertEmailAssetInput = (input: {
    contentType: string;
    sizeBytes: number;
}) => {
    if (!allowedEmailAssetTypes.has(input.contentType)) {
        throw new Error(
            "Only JPEG, PNG, GIF and WebP images are supported.",
        );
    }

    if (
        !Number.isFinite(input.sizeBytes) ||
        input.sizeBytes <= 0 ||
        input.sizeBytes > maxEmailAssetSize
    ) {
        throw new Error(
            "Image must be smaller than 5 MB.",
        );
    }
};

const emailAssetPath = (
    workspaceId: string,
    publicId: string,
) =>
    `private/email-assets/${workspaceId}/${publicId}`;

export async function createEmailAssetUploadUrl(input: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
}) {
    const user = await isSignedIn();

    if (!user) {
        throw new Error("Unauthorized");
    }

    assertEmailAssetInput(input);

    // Validates that the current user has access to the
    // workspace stored in their cookie.
    await rlsClient();

    const workspaceId = await getWorkspaceId();
    const publicId = crypto.randomUUID();
    const path = emailAssetPath(
        workspaceId,
        publicId,
    );

    const { S3_BUCKET } = getServerEnv();

    if (!S3_BUCKET) {
        throw new Error("S3 bucket is not configured");
    }

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: path,
        ContentType: input.contentType,
        CacheControl:
            "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(
        s3,
        command,
        {
            expiresIn: 300,
        },
    );

    return {
        publicId,
        uploadUrl,
    };
}

export async function completeEmailAssetUpload(input: {
    publicId: string;
    fileName: string;
}) {
    const user = await isSignedIn();

    if (!user) {
        throw new Error("Unauthorized");
    }

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            input.publicId,
        )
    ) {
        throw new Error("Invalid asset identifier");
    }

    const workspaceId = await getWorkspaceId();
    const rls = await rlsClient();

    const { S3_BUCKET } = getServerEnv();
    const { WEB_URL } = getPublicEnv();

    if (!S3_BUCKET) {
        throw new Error("S3 bucket is not configured");
    }

    const path = emailAssetPath(
        workspaceId,
        input.publicId,
    );

    const response = await s3.send(
        new HeadObjectCommand({
            Bucket: S3_BUCKET,
            Key: path,
        }),
    );

    const contentType =
        response.ContentType ??
        "application/octet-stream";

    const sizeBytes = Number(
        response.ContentLength ?? 0,
    );

    try {
        assertEmailAssetInput({
            contentType,
            sizeBytes,
        });
    } catch (error) {
        await s3
            .send(
                new DeleteObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: path,
                }),
            )
            .catch(() => undefined);

        throw error;
    }

    const [createdAsset] = await rls((tx) =>
        tx
            .insert(emailAssets)
            .values({
                publicId: input.publicId,
                workspaceId,
                bucketId: S3_BUCKET,
                path,
                filenameOriginal:
                    input.fileName
                        .trim()
                        .slice(0, 255) || null,
                contentType,
                sizeBytes,
            })
            .onConflictDoNothing()
            .returning(),
    );

    const asset =
        createdAsset ??
        (
            await rls((tx) =>
                tx
                    .select()
                    .from(emailAssets)
                    .where(
                        eq(
                            emailAssets.publicId,
                            input.publicId,
                        ),
                    )
                    .limit(1),
            )
        )[0];

    if (!asset) {
        throw new Error(
            "Could not complete image upload",
        );
    }

    const baseUrl = String(WEB_URL).replace(
        /\/+$/,
        "",
    );

    return {
        publicId: asset.publicId,
        url: `${baseUrl}/api/email-assets/${asset.publicId}`,
    };
}
