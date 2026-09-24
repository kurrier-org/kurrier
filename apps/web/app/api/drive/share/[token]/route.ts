import { createHash } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, driveEntries, driveShareLinks, driveVolumes } from "@db";
import { DISTRIBUTION_CONFIG } from "@distribution/config";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { s3 } from "@/lib/create-s3-client";

function unavailable() {
    return NextResponse.json(
        { error: "Share link not found or expired" },
        {
            status: 404,
            headers: { "Cache-Control": "no-store" },
        },
    );
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> },
) {
    if (!DISTRIBUTION_CONFIG.features.drive) {
        return unavailable();
    }

    const { token } = await params;

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
        return unavailable();
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [result] = await db
        .select({
            entry: driveEntries,
            volume: driveVolumes,
        })
        .from(driveShareLinks)
        .innerJoin(
            driveEntries,
            and(
                eq(driveEntries.id, driveShareLinks.entryId),
                eq(driveEntries.workspaceId, driveShareLinks.workspaceId),
            ),
        )
        .innerJoin(
            driveVolumes,
            and(
                eq(driveVolumes.id, driveEntries.volumeId),
                eq(driveVolumes.workspaceId, driveEntries.workspaceId),
            ),
        )
        .where(
            and(
                eq(driveShareLinks.tokenHash, tokenHash),
                isNull(driveShareLinks.revokedAt),
                gt(driveShareLinks.expiresAt, new Date()),
                eq(driveEntries.type, "file"),
                eq(driveVolumes.kind, "cloud"),
            ),
        )
        .limit(1);

    if (!result) {
        return unavailable();
    }

    const { entry, volume } = result;

    const bucket = String(volume.metaData?.bucket ?? "").trim();
    const key = String(entry.metaData?.key ?? "");


    const expectedKey = `drive/workspaces/${volume.workspaceId}/${volume.code}/` + entry.path.replace(/^\/+/, "");

    if (!bucket || key !== expectedKey) {
        return unavailable();
    }

    const downloadUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
            ResponseContentDisposition:
                `attachment; filename*=UTF-8''${encodeURIComponent(entry.name)}`,
        }),
        { expiresIn: 60 },
    );

    return NextResponse.redirect(downloadUrl, {
        status: 307,
        headers: { "Cache-Control": "no-store" },
    });
}
