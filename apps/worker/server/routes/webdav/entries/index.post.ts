import { defineEventHandler, getQuery, H3Event, setResponseStatus } from "h3";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { db, driveUploadIntents, driveVolumes } from "@db";
import { and, eq, isNull } from "drizzle-orm";

const isProd = process.env.NODE_ENV === "production";

const LOCAL_ROOT = isProd
    ? "/webdav-data"
    : path.join(process.cwd(), "../../db/webdav/data");

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

const saveFilePath = async (outPath: string, event: H3Event) => {
    await mkdir(path.dirname(outPath), { recursive: true });
    const ws = fs.createWriteStream(outPath);

    try {
        await pipeline(event.node.req, ws);
        return { ok: true, path: outPath };
    } catch (e: any) {
        try { ws.destroy(); } catch {}
        return { ok: false, error: e?.message ?? "upload failed" };
    }
};

function normalizeTargetPath(p: string) {
    const raw = String(p || "").trim();
    const parts = raw.split("/").filter(Boolean).map((seg) => decodeURIComponent(seg));

    for (const seg of parts) {
        if (seg === "." || seg === ".." || seg.includes("\0")) throw new Error("Invalid path");
    }

    return "/" + parts.join("/");
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const token = query.token ? String(query.token) : "";

    if (!token) {
        setResponseStatus(event, 400);
        return "Missing token";
    }

    const now = new Date();

    const intentRow = await db.transaction(async (tx) => {
        const [row] = await tx
            .select({
                id: driveUploadIntents.id,
                token: driveUploadIntents.token,
                targetPath: driveUploadIntents.targetPath,
                singleUse: driveUploadIntents.singleUse,
                usedAt: driveUploadIntents.usedAt,
                expiresAt: driveUploadIntents.expiresAt,
                volumeId: driveUploadIntents.volumeId,
                volumeBasePath: driveVolumes.basePath,
                volumeCode: driveVolumes.code,
            })
            .from(driveUploadIntents)
            .innerJoin(driveVolumes, eq(driveVolumes.id, driveUploadIntents.volumeId))
            .where(eq(driveUploadIntents.token, token))
            .limit(1);

        if (!row) return null;
        if (!row.expiresAt || row.expiresAt.getTime() <= now.getTime()) return { expired: true } as any;

        if (row.singleUse) {
            const [updated] = await tx
                .update(driveUploadIntents)
                .set({ usedAt: now, updatedAt: now })
                .where(and(eq(driveUploadIntents.id, row.id), isNull(driveUploadIntents.usedAt)))
                .returning({ id: driveUploadIntents.id });

            if (!updated) return { alreadyUsed: true } as any;
        }

        return row;
    });

    console.log("intentRow", intentRow)

    if (!intentRow) {
        setResponseStatus(event, 404);
        return "Invalid token";
    }

    if ((intentRow as any).expired) {
        setResponseStatus(event, 410);
        return "Token expired";
    }

    if ((intentRow as any).alreadyUsed) {
        setResponseStatus(event, 409);
        return "Token already used";
    }

    if (!intentRow.volumeBasePath) {
        setResponseStatus(event, 404);
        return "Volume missing basePath";
    }

    let normalizedTargetPath: string;
    try {
        normalizedTargetPath = normalizeTargetPath(intentRow.targetPath);
    } catch {
        setResponseStatus(event, 400);
        return "Invalid targetPath";
    }

    const filePath = path.posix.join(
        String(intentRow.volumeBasePath),
        trimSlashes(normalizedTargetPath),
    );

    const outPath = path.join(LOCAL_ROOT, filePath);

    const res = await saveFilePath(outPath, event);
    if (!res.ok) {
        setResponseStatus(event, 500);
        return res.error ?? "Upload failed";
    }

    return { ok: true };
});
