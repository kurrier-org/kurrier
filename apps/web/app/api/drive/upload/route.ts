import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, gt, isNull } from "drizzle-orm";
import { driveUploadIntents, driveVolumes } from "@db";
import { s3 } from "@/lib/create-s3-client";
import { rlsClient } from "@/lib/actions/clients";
import { SITE_FEATURES } from "@/lib/site-features";

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

export async function POST(req: NextRequest) {
    if (!SITE_FEATURES.drive) {
        return NextResponse.json({ error: "Drive is disabled" }, { status: 404 });
    }

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const uploadToken = String(formData.get("uploadToken") || "");

    if (!file) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!uploadToken) {
        return NextResponse.json(
            { error: "Missing upload token" },
            { status: 400 },
        );
    }

    const rls = await rlsClient();

    const intent = await rls(async (tx) => {
        const [row] = await tx
            .select()
            .from(driveUploadIntents)
            .where(
                and(
                    eq(driveUploadIntents.token, uploadToken),
                    isNull(driveUploadIntents.usedAt),
                    gt(driveUploadIntents.expiresAt, new Date()),
                ),
            )
            .limit(1);

        return row ?? null;
    });

    if (!intent) {
        return NextResponse.json(
            { error: "Invalid or expired upload token" },
            { status: 403 },
        );
    }

    const volume = await rls(async (tx) => {
        const [row] = await tx
            .select()
            .from(driveVolumes)
            .where(eq(driveVolumes.id, intent.volumeId))
            .limit(1);

        return row ?? null;
    });

    if (!volume) {
        return NextResponse.json(
            { error: "Volume not found" },
            { status: 404 },
        );
    }

    const bucket = String(volume.metaData?.bucket || "");

    if (!bucket) {
        return NextResponse.json(
            { error: "Cloud volume missing bucket" },
            { status: 500 },
        );
    }

    const volumePrefix = `drive/workspaces/${volume.workspaceId}/${volume.code}/`;
    const relativeKey = trimSlashes(intent.targetPath);
    const key = `${volumePrefix}${relativeKey}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
            Metadata: {
                filename: file.name,
                volumeId: String(volume.id),
            },
        }),
    );

    await rls(async (tx) => {
        await tx
            .update(driveUploadIntents)
            .set({
                usedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(driveUploadIntents.id, intent.id),
                    isNull(driveUploadIntents.usedAt),
                ),
            );
    });

    return NextResponse.json({
        ok: true,
    });
}
