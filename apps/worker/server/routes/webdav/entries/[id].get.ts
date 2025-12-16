import {
    defineEventHandler,
    getRouterParams,
    H3Event,
    setHeader,
    setResponseStatus,
} from "h3";
import { db, driveEntries, driveVolumes } from "@db";
import { and, eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { createSupabaseFromRequest } from "../../../../lib/create-client-ssr-from-request";

const isProd = process.env.NODE_ENV === "production";

const LOCAL_ROOT = isProd
    ? "/webdav-data"
    : path.join(process.cwd(), "../../db/webdav/data");

const dispatchFilePath = async (filePath: string, fileName: string, event: H3Event) => {
    if (!fs.existsSync(filePath)) {
        setResponseStatus(event, 404);
        return "Not Found";
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = event.node.req.headers.range;

    setHeader(event, "Accept-Ranges", "bytes");
    setHeader(event, "Content-Type", "application/octet-stream");
    setHeader(
        event,
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`,
    );

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

export default defineEventHandler(async (event) => {
    const supabase = createSupabaseFromRequest(event);
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        setResponseStatus(event, 401);
        return "Unauthorized";
    }

    const params = getRouterParams(event);
    const entryId = params.id;

    if (!entryId) {
        setResponseStatus(event, 400);
        return "Missing entry id";
    }

    const [entry] = await db
        .select()
        .from(driveEntries)
        .where(
            and(
                eq(driveEntries.id, entryId),
                eq(driveEntries.ownerId, data.user.id),
            ),
        )
        .limit(1);

    if (!entry) {
        setResponseStatus(event, 404);
        return "Not Found";
    }

    const [volume] = await db
        .select()
        .from(driveVolumes)
        .where(
            and(
                eq(driveVolumes.id, entry.volumeId),
                eq(driveVolumes.ownerId, data.user.id),
                eq(driveVolumes.code, "home"),
            ),
        )
        .limit(1);

    if (!volume?.basePath) {
        setResponseStatus(event, 404);
        return "Home volume not found";
    }

    const absolutePath = path.join(
        LOCAL_ROOT,
        volume.basePath,
        entry.path,
    );

    return dispatchFilePath(absolutePath, entry.name, event);
});
