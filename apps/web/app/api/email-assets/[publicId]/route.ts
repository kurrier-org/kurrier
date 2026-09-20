import {
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
    db,
    emailAssets,
} from "@db";
import {
    and,
    eq,
    isNull,
} from "drizzle-orm";

import { s3 } from "@/lib/create-s3-client";

type RouteContext = {
    params: Promise<{
        publicId: string;
    }>;
};

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    const { publicId } = await context.params;

    if (!isUuid(publicId)) {
        return new Response("Not found", {
            status: 404,
        });
    }

    /*
     * Deliberately uses the server database client rather
     * than rlsClient: this is a public read endpoint whose
     * access capability is the unguessable publicId.
     */
    const [asset] = await db
        .select()
        .from(emailAssets)
        .where(
            and(
                eq(emailAssets.publicId, publicId),
                isNull(emailAssets.revokedAt),
            ),
        )
        .limit(1);

    if (!asset) {
        return new Response("Not found", {
            status: 404,
        });
    }

    try {
        const object = await s3.send(
            new GetObjectCommand({
                Bucket: asset.bucketId,
                Key: asset.path,
            }),
        );

        if (!object.Body) {
            return new Response("Not found", {
                status: 404,
            });
        }

        const body =
            object.Body.transformToWebStream();

        const headers = new Headers({
            "Content-Type": asset.contentType,
            "Cache-Control":
                "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy":
                "cross-origin",
            "Access-Control-Allow-Origin": "*",
            "Content-Disposition":
                `inline; filename*=UTF-8''${encodeURIComponent(
                    asset.filenameOriginal ??
                    "email-image",
                )}`,
        });

        if (asset.sizeBytes > 0) {
            headers.set(
                "Content-Length",
                String(asset.sizeBytes),
            );
        }

        if (object.ETag) {
            headers.set("ETag", object.ETag);
        }

        if (object.LastModified) {
            headers.set(
                "Last-Modified",
                object.LastModified.toUTCString(),
            );
        }

        return new Response(body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error(
            `[email-assets] failed to read ${publicId}`,
            error,
        );

        return new Response("Asset unavailable", {
            status: 502,
        });
    }
}
