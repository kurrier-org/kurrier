import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {GetObjectCommand} from "@aws-sdk/client-s3";

import { S3Client } from "@aws-sdk/client-s3";
import {getServerEnv} from "@schema";

const {
    S3_REGION,
    S3_ACCESS_KEY,
    S3_SECRET_KEY,
    S3_ENDPOINT,
    S3_FORCE_PATH_STYLE,
} = getServerEnv();

if (!S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error(`Missing required S3 environment variables: ${!S3_REGION ? 'S3_REGION' : ''} ${!S3_ACCESS_KEY ? 'S3_ACCESS_KEY' : ''} ${!S3_SECRET_KEY ? 'S3_SECRET_KEY' : ''}`.trim());
}

export const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: String(S3_FORCE_PATH_STYLE) === "true",
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
});


export const generateSignedUrl = async (key: string, expiresIn?: number) => {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
    });
    const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: expiresIn ?? 3600,
    });
    return signedUrl;

};
