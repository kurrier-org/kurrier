import { db, storageDeletions } from "@db";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { eq, isNull, sql } from "drizzle-orm";
import { s3 } from "../create-s3-client";

export async function processStorageDeletions() {
    const pending = await db
        .select()
        .from(storageDeletions)
        .where(isNull(storageDeletions.processedAt))
        .orderBy(storageDeletions.createdAt)
        .limit(100);


    for (const item of pending) {
        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: item.bucketId ?? process.env.S3_BUCKET!,
                    Key: item.path,
                }),
            );

            await db
                .delete(storageDeletions)
                .where(eq(storageDeletions.id, item.id));
        } catch (error) {
            console.info(error);
            await db
                .update(storageDeletions)
                .set({
                    attempts: sql`${storageDeletions.attempts} + 1`,
                    lastError:
                        error instanceof Error
                            ? error.message
                            : String(error),
                })
                .where(eq(storageDeletions.id, item.id));
        }
    }

    return { processed: pending.length };
}
