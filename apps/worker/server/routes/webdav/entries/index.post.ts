import { defineEventHandler, getQuery, H3Event, setResponseStatus } from "h3";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { db, driveVolumes } from "@db";
import { and, eq } from "drizzle-orm";
import { createSupabaseFromRequest } from "../../../../lib/create-client-ssr-from-request";

const isProd = process.env.NODE_ENV === "production";

const LOCAL_ROOT = isProd
    ? "/webdav-data"
    : path.join(process.cwd(), "../../db/webdav/data");

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

function decodeRoutePathToPosix(p: string) {
    const raw = String(p || "");
    const parts = raw.split("/").filter(Boolean).map((seg) => decodeURIComponent(seg));

    for (const seg of parts) {
        if (seg === "." || seg === ".." || seg.includes("\0")) throw new Error("Invalid path");
    }

    return "/" + parts.join("/");
}

export default defineEventHandler(async (event) => {
    const supabase = createSupabaseFromRequest(event);
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        setResponseStatus(event, 401);
        return "Unauthorized";
    }

    const ownerId = data.user.id;
    const query = getQuery(event);
    const queryPath = query.path ? String(query.path) : "";

    if (!queryPath) {
        setResponseStatus(event, 400);
        return "Missing path";
    }

    let decodedPath: string;
    try {
        decodedPath = decodeRoutePathToPosix(queryPath);
    } catch {
        setResponseStatus(event, 400);
        return "Invalid path";
    }

    const [volume] = await db
        .select()
        .from(driveVolumes)
        .where(and(eq(driveVolumes.ownerId, ownerId), eq(driveVolumes.code, "home")))
        .limit(1);

    if (!volume?.basePath) {
        setResponseStatus(event, 404);
        return "Home volume not found";
    }

    const filePath = path.posix.join(volume.basePath, decodedPath);
    const outPath = path.join(LOCAL_ROOT, filePath);

    const res = await saveFilePath(outPath, event);
    if (!res.ok) {
        setResponseStatus(event, 500);
        return res.error ?? "Upload failed";
    }

    return { ok: true };
});
