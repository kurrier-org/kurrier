import { S3Client } from "@aws-sdk/client-s3";
import { getServerEnv } from "@schema";

const {
    S3_REGION,
    S3_ENDPOINT,
    S3_ACCESS_KEY,
    S3_SECRET_KEY,
    S3_FORCE_PATH_STYLE,
} = getServerEnv();

export const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE === "true",
    credentials: {
        accessKeyId: S3_ACCESS_KEY!,
        secretAccessKey: S3_SECRET_KEY!,
    },
});
