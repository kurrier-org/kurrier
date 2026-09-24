import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db, workspaces } from "@db";
import { getServerEnv } from "@schema";
import { eq } from "drizzle-orm";
import { s3 } from "@/lib/create-s3-client";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ publicId: string }> },
) {
    const { publicId } = await params;

    const [workspace] = await db
        .select({
            id: workspaces.id,
            logoKey: workspaces.logoKey,
        })
        .from(workspaces)
        .where(eq(workspaces.publicId, publicId))
        .limit(1);

    if (
        !workspace?.logoKey ||
        !workspace.logoKey.startsWith(
            `private/workspaces/${workspace.id}/logos/`,
        )
    ) {
        return new Response("Not found", { status: 404 });
    }

    const { S3_BUCKET } = getServerEnv();

    if (!S3_BUCKET) {
        return new Response("Asset unavailable", { status: 503 });
    }

    try {
        const object = await s3.send(
            new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: workspace.logoKey,
            }),
        );

        if (
            !object.Body ||
            !object.ContentType ||
            !["image/png", "image/jpeg", "image/webp"].includes(
                object.ContentType,
            )
        ) {
            return new Response("Not found", { status: 404 });
        }

        return new Response(object.Body.transformToWebStream(), {
            headers: {
                "Content-Type": object.ContentType,
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=300",
                "X-Content-Type-Options": "nosniff",
                "Cross-Origin-Resource-Policy": "cross-origin",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("[workspace-logo] failed to read", publicId, error);
        return new Response("Asset unavailable", { status: 502 });
    }
}
