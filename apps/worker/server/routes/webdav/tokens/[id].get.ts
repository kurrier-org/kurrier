import {
    defineEventHandler,
    getRouterParams,
    H3Event,
    setHeader,
    setResponseStatus,
} from "h3";
import { db, driveEntries, driveUploadIntents, driveVolumes } from "@db";
import { and, eq, isNull } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

const LOCAL_ROOT =
    process.env.NODE_ENV === "production"
        ? "/data"
        : path.join(process.cwd(), "../../db/webdav/data");

const dispatchFilePath = async (filePath: string, fileName: string, contentType: string | null, event: H3Event) => {
    if (!fs.existsSync(filePath)) {
        setResponseStatus(event, 404);
        return "Not Found";
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = event.node.req.headers.range;

    setHeader(event, "Accept-Ranges", "bytes");
    setHeader(event, "Content-Type", contentType || "application/octet-stream");
    setHeader(event, "Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);

    if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (!match) {
            setResponseStatus(event, 416);
            return "Invalid Range";
        }

        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : total - 1;

        setResponseStatus(event, 206);
        setHeader(event, "Content-Length", end - start + 1);
        setHeader(event, "Content-Range", `bytes ${start}-${end}/${total}`);

        return fs.createReadStream(filePath, { start, end });
    }

    setResponseStatus(event, 200);
    setHeader(event, "Content-Length", total);
    return fs.createReadStream(filePath);
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
    const params = getRouterParams(event);
    const tokenId = String(params.id || "");

    if (!tokenId) {
        setResponseStatus(event, 400);
        return "Missing token id";
    }

    const now = new Date();

    const resolved = await db.transaction(async (tx) => {
        const [intent] = await tx
            .select({
                id: driveUploadIntents.id,
                ownerId: driveUploadIntents.ownerId,
                volumeId: driveUploadIntents.volumeId,
                targetPath: driveUploadIntents.targetPath,
                singleUse: driveUploadIntents.singleUse,
                usedAt: driveUploadIntents.usedAt,
                expiresAt: driveUploadIntents.expiresAt,
                volumeBasePath: driveVolumes.basePath,
            })
            .from(driveUploadIntents)
            .innerJoin(driveVolumes, eq(driveVolumes.id, driveUploadIntents.volumeId))
            .where(eq(driveUploadIntents.id, tokenId))
            .limit(1);

        if (!intent) return { kind: "missing" as const };

        if (!intent.expiresAt || intent.expiresAt.getTime() <= now.getTime()) {
            return { kind: "expired" as const };
        }

        if (intent.singleUse) {
            const [updated] = await tx
                .update(driveUploadIntents)
                .set({ usedAt: now, updatedAt: now })
                .where(and(eq(driveUploadIntents.id, intent.id), isNull(driveUploadIntents.usedAt)))
                .returning({ id: driveUploadIntents.id });

            if (!updated) return { kind: "used" as const };
        }

        const [entry] = await tx
            .select({
                id: driveEntries.id,
                name: driveEntries.name,
                path: driveEntries.path,
                mimeType: driveEntries.mimeType,
            })
            .from(driveEntries)
            .where(
                and(
                    eq(driveEntries.ownerId, intent.ownerId),
                    eq(driveEntries.volumeId, intent.volumeId),
                    eq(driveEntries.path, intent.targetPath),
                ),
            )
            .limit(1);

        if (!entry) return { kind: "entry_missing" as const };

        if (!intent.volumeBasePath) return { kind: "volume_missing" as const };

        return {
            kind: "ok" as const,
            volumeBasePath: intent.volumeBasePath,
            entry,
        };
    });

    if (resolved.kind === "missing") {
        setResponseStatus(event, 404);
        return "Invalid token";
    }

    if (resolved.kind === "expired") {
        setResponseStatus(event, 410);
        return "Token expired";
    }

    if (resolved.kind === "used") {
        setResponseStatus(event, 409);
        return "Token already used";
    }

    if (resolved.kind === "entry_missing") {
        setResponseStatus(event, 404);
        return "Entry not found";
    }

    if (resolved.kind === "volume_missing") {
        setResponseStatus(event, 404);
        return "Volume missing basePath";
    }

    let normalizedTargetPath: string;
    try {
        normalizedTargetPath = normalizeTargetPath(resolved.entry.path);
    } catch {
        setResponseStatus(event, 400);
        return "Invalid targetPath";
    }

    const relativeTargetPath = normalizedTargetPath.replace(/^\/+/, "");

    const absolutePath = path.join(
        LOCAL_ROOT,
        String(resolved.volumeBasePath),
        relativeTargetPath,
    );

    return dispatchFilePath(absolutePath, resolved.entry.name, resolved.entry.mimeType ?? null, event);
});
