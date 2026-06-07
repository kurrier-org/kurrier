import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/create-s3-client";

export async function POST(req: NextRequest) {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const bucket = String(formData.get("bucket") || "");
    const key = String(formData.get("key") || "");

    if (!file) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!bucket || !key) {
        return NextResponse.json({ error: "Missing bucket or key" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
            Metadata: {
                filename: file.name,
            },
        }),
    );

    return NextResponse.json({
        ok: true,
        bucket,
        key,
    });
}
