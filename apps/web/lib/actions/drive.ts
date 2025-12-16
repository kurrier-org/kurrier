"use server";

import { getRedis } from "@/lib/actions/get-redis";
import { isSignedIn } from "@/lib/actions/auth";
import { driveEntries, DriveVolumeEntity, driveVolumes, providers, providerSecrets } from "@db";
import { rlsClient } from "@/lib/actions/clients";
import { DriveRouteContext, FormState, handleAction, Providers } from "@schema";
import { decode } from "decode-formdata";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { fetchDecryptedSecrets } from "@/lib/actions/dashboard";
import { createStore, ListPathEntry, ListPathResult } from "@providers";
import mime from "mime-types"

const onRemove = {
    // removeOnComplete: { age: 60 * 5, count: 1000 },
    // removeOnFail: { age: 60 * 60, count: 1000 },
    removeOnComplete: false,
    removeOnFail: false,
}

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

export const normalizeWithinPath = async (segments: string[]) => {
    const cleaned = (segments ?? [])
        .filter(Boolean)
        .map((s) => trimSlashes(decodeURIComponent(s)));

    const isCloud = cleaned[0] === "volumes" && !!cleaned[1];
    const publicId = isCloud ? cleaned[1] : undefined;

    const within = isCloud ? cleaned.slice(2) : cleaned;
    const withinPath = "/" + within.filter(Boolean).join("/");

    const rls = await rlsClient();
    const driveVolume = publicId
        ? await rls(async (tx) => {
            const [vol] = await tx
                .select()
                .from(driveVolumes)
                .where(eq(driveVolumes.publicId, publicId))
                .limit(1);
            return vol ?? null;
        })
        : null;

    return {
        scope: driveVolume ? "cloud" : "home",
        within,
        withinPath: withinPath === "/" ? "/" : withinPath,
        driveVolume,
    } satisfies DriveRouteContext;
};



export const fetchVolumes = async () => {
    const { davQueue, davEvents } = await getRedis();
    const user = await isSignedIn();
    const job = await davQueue.add("dav:drive:discover-user-volumes",
        { userId: user?.id },
        onRemove
    );

    const vols = await job.waitUntilFinished(davEvents)
    const localVolumes = vols
        .filter((v: DriveVolumeEntity) => v.kind === "local" && v.code !== "home")
    const cloudVolumes = vols
        .filter((v: DriveVolumeEntity) => v.kind === "cloud")
    return {localVolumes, cloudVolumes}
};


export const fetchListPath = async (path: string[]) => {
    const { davQueue, davEvents } = await getRedis();
    const user = await isSignedIn();

    const job = await davQueue.add(
        "dav:drive:list-path",
        {
            ownerId: user?.id,
            segments: path ?? [],
        },
        onRemove
    );

    return await job.waitUntilFinished(davEvents);
};


export async function deletePath(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        const rls = await rlsClient();
        const entry = await rls(async (tx) => {
            const [e] = await tx
                .select()
                .from(driveEntries)
                .where(and(
                    eq(driveEntries.id, decodedForm.entryId as string)
                ))
            return e
        })

        const volume = await rls(async (tx) => {
            const [vol] = await tx
                .select()
                .from(driveVolumes)
                .where(and(
                    eq(driveVolumes.id, entry.volumeId)
                ))
            return vol
        })

        if (volume.kind === "cloud") {
            const [secret] = await fetchDecryptedSecrets({
                linkTable: providerSecrets,
                foreignCol: providerSecrets.providerId,
                secretIdCol: providerSecrets.secretId,
                parentId: String(volume.providerId),
            });
            const providerType = "s3" as Providers;
            const store = createStore(providerType, secret.parsedSecret);
            await store.deleteEntry(String(volume.providerId), {
                bucket: String(volume?.metaData?.bucket),
                path: String(entry.path),
                type: entry.type,
            });

            await rls(async (tx) => {
                await tx
                    .delete(driveEntries)
                    .where(eq(driveEntries.id, entry.id),);
            })


            revalidatePath("/dashboard/drive");
            return { success: true };
        }


        const { davQueue, davEvents } = await getRedis();
        const user = await isSignedIn();

        const job = await davQueue.add(
            "dav:drive:delete-path",
            {
                ownerId: user?.id,
                volumeId: entry.volumeId,
                href: entry?.metaData?.href,
            },
            onRemove
        );

        await job.waitUntilFinished(davEvents);
        revalidatePath("/dashboard/drive");

        return { success: true };
    });
}


export const normalizeWithinPathString =  async (path: unknown) => {
    const raw = typeof path === "string" ? path : "/";
    const cleaned = "/" + trimSlashes(decodeURIComponent(raw));
    return cleaned === "/" ? "/" : cleaned;
};



const ensureTrailingSlash = (p: string) => (p.endsWith("/") ? p : `${p}/`);
const toVolumeRelativePath = (withinVolumeSegments: string[], nameOrFolder: string) => {
    const base = withinVolumeSegments.filter(Boolean).map(trimSlashes).join("/");
    const full = base ? `${base}/${nameOrFolder}` : nameOrFolder;
    return `/${trimSlashes(full)}`;
};

const joinUiFolderPath = (withinPath: string, name: string) => {
    const base = ensureTrailingSlash(withinPath || "/");
    const leaf = trimSlashes(name);
    const out = `${base}${leaf}`;
    return ensureTrailingSlash(out.startsWith("/") ? out : `/${out}`);
};




export async function addNewFolder(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        console.log("decodedForm", decodedForm)

        const name = typeof decodedForm.name === "string" ? decodedForm.name.trim() : "";
        if (!name) return { success: false, error: "Folder name is required" };

        const withinPath = await normalizeWithinPathString(decodedForm.path);

        const scope =
            decodedForm.scope === "cloud" || decodedForm.scope === "home"
                ? decodedForm.scope
                : "home";

        const publicId =
            typeof decodedForm.publicId === "string" && decodedForm.publicId.trim()
                ? decodedForm.publicId.trim()
                : undefined;

        const rls = await rlsClient();

        if (scope === "cloud") {
            if (!publicId) return { success: false, error: "Missing volume" };

            const vol = await rls(async (tx) => {
                const [v] = await tx
                    .select()
                    .from(driveVolumes)
                    .where(eq(driveVolumes.publicId, publicId))
                    .limit(1);
                return v ?? null;
            });

            if (!vol) return { success: false, error: "Volume not found" };
            if (vol.kind !== "cloud") return { success: false, error: "Invalid volume type" };

            const bucket = String(vol.metaData?.bucket || "").trim();
            const providerId = String(vol.providerId || "").trim();
            if (!bucket) return { success: false, error: "Cloud volume missing bucket" };
            if (!providerId) return { success: false, error: "Cloud volume missing providerId" };

            const prov = await rls(async (tx) => {
                const [p] = await tx.select().from(providers).where(eq(providers.id, providerId)).limit(1);
                return p ?? null;
            });

            if (!prov) return { success: false, error: "Storage provider not found" };

            const uiFolderPath = joinUiFolderPath(withinPath, name);

            const [secret] = await fetchDecryptedSecrets({
                linkTable: providerSecrets,
                foreignCol: providerSecrets.providerId,
                secretIdCol: providerSecrets.secretId,
                parentId: providerId,
            });

            const store = createStore("s3", secret.parsedSecret);
            const res = await store.addFolder(prov.id, { bucket, path: uiFolderPath });
            if (!res.ok) return { success: false, error: res.message || "Failed to create folder" };

            const withinSegs = trimSlashes(withinPath || "")
                .split("/")
                .filter(Boolean)
                .map(trimSlashes);

            const now = new Date();
            const row = {
                volumeId: vol.id,
                type: "folder" as const,
                path: toVolumeRelativePath(withinSegs, name),
                name,
                sizeBytes: 0,
                mimeType: null as string | null,
                updatedAt: now,
                metaData: {
                    kind: "cloud",
                    bucket,
                    key: trimSlashes(uiFolderPath),
                    lastModified: now.toISOString(),
                },
            };

            await rls(async (tx) => {
                await tx
                    .insert(driveEntries)
                    .values([row])
                    .onConflictDoNothing({
                        target: [driveEntries.ownerId, driveEntries.volumeId, driveEntries.path],
                    });
            });

            revalidatePath("/dashboard/drive");
            return { success: true };
        }

        const user = await isSignedIn();
        const { davQueue, davEvents } = await getRedis();
        const job = await davQueue.add(
            "dav:drive:add-folder-path",
            { ownerId: String(user?.id), withinPath, name },
            onRemove,
        );
        await job.waitUntilFinished(davEvents);
        revalidatePath("/dashboard/drive");
        return { success: true };
    });
}


export const refreshViewAfterUpload = async () => {
    return revalidatePath("/dashboard/drive");
};



export async function fetchCloudListPath(ctx: DriveRouteContext) {
    const volume = ctx.driveVolume;
    if (!volume) throw new Error("Missing driveVolume");

    const volumeId = volume.id;
    const providerId = String(volume.providerId);
    const bucket = String(volume.metaData?.bucket || "");
    if (!bucket) throw new Error("Missing bucket in volume metaData");

    const [secret] = await fetchDecryptedSecrets({
        linkTable: providerSecrets,
        foreignCol: providerSecrets.providerId,
        secretIdCol: providerSecrets.secretId,
        parentId: providerId,
    });

    const store = createStore("s3", secret.parsedSecret);
    const list: ListPathResult = await store.listPath(providerId, {
        bucket,
        path: ctx.withinPath || "/",
        maxKeys: 200,
    });
    if (!list.ok || !list.data) {
        throw new Error(list.message || "Failed to list bucket path");
    }
    const now = new Date();
    const rows = list.data.entries.map((e) =>
        toDriveEntryRow({
            volumeId,
            e,
            now,
            bucket,
            volumeCode: volume.code,
        }),
    );
    if (!rows.length) return [];
    const rls = await rlsClient();
    const finalRows = await rls(async (tx) => {
        return tx
            .insert(driveEntries)
            .values(rows)
            .onConflictDoUpdate({
                target: [driveEntries.ownerId, driveEntries.volumeId, driveEntries.path],
                set: {
                    type: driveEntries.type,
                    name: driveEntries.name,
                    sizeBytes: driveEntries.sizeBytes,
                    mimeType: driveEntries.mimeType,
                    metaData: driveEntries.metaData,
                    updatedAt: driveEntries.updatedAt,
                },
            })
            .returning();
    });
    return finalRows;
}


function toDriveEntryRow(args: {
    volumeId: string;
    e: ListPathEntry;
    now: Date;
    bucket: string;
    volumeCode: string;
}) {
    const { volumeId, e, now, bucket, volumeCode } = args;

    return {
        volumeId,
        type: e.type,
        path: e.path,
        name: e.name,
        sizeBytes: e.type === "file" ? e.sizeBytes ?? 0 : 0,
        mimeType: e.type === "file" ? (mime.contentType(e.name) || null) : null,
        metaData: {
            bucket,
            volumeCode,
            lastModified: e.lastModified ?? null,
        },
        updatedAt: now,
        createdAt: now,
    };
}


export async function fetchDownloadLink(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        const rls = await rlsClient();
        const entry = await rls(async (tx) => {
            const [e] = await tx
                .select()
                .from(driveEntries)
                .where(and(
                    eq(driveEntries.id, decodedForm.entryId as string)
                ))
            return e
        })

        const volume = await rls(async (tx) => {
            const [vol] = await tx
                .select()
                .from(driveVolumes)
                .where(and(
                    eq(driveVolumes.id, entry.volumeId)
                ))
            return vol
        })

        if (volume.kind !== "cloud") {
            const downloadUrl = `/webdav/entries/${entry.id}`;
            return { success: true, data: {
                    downloadUrl
                } };
        } else if (volume.kind === "cloud") {
            const [secret] = await fetchDecryptedSecrets({
                linkTable: providerSecrets,
                foreignCol: providerSecrets.providerId,
                secretIdCol: providerSecrets.secretId,
                parentId: String(volume.providerId),
            });
            const providerType = "s3" as Providers;
            const store = createStore(providerType, secret.parsedSecret);
            const res = await store.downloadUrl(String(volume.providerId), {
                bucket: String(volume?.metaData?.bucket),
                path: String(entry.path)
            });
            if (res.ok) {
                return { success: true, data: { downloadUrl: res.data?.url } };
            }


        }

        return { success: true };

    });
}




function joinPaths(base: string, leaf: string) {
    const b = (base || "/").replace(/\/+$/g, "");
    const l = (leaf || "").replace(/^\/+/g, "");
    const out = `${b}/${l}`;
    return out === "" ? "/" : out;
}

export async function getCloudUploadUrl(
    ctx: DriveRouteContext,
    input: {
        filename: string;
        sizeBytes?: number;
        contentType?: string | null;
    },
) {
    const volume = ctx.driveVolume;
    if (!volume) throw new Error("Missing driveVolume");

    const user = await isSignedIn();
    const ownerId = String(user?.id || "");
    if (!ownerId) throw new Error("Not signed in");

    const providerId = String(volume.providerId || "");
    if (!providerId) throw new Error("Missing providerId");

    const bucket = String(volume.metaData?.bucket || "");
    if (!bucket) throw new Error("Missing bucket in volume metaData");

    const withinPath = String(ctx.withinPath || "/");
    const filename = String(input.filename || "").trim();
    if (!filename) throw new Error("Missing filename");

    const fullPath = joinPaths(withinPath, filename);

    const [secret] = await fetchDecryptedSecrets({
        linkTable: providerSecrets,
        foreignCol: providerSecrets.providerId,
        secretIdCol: providerSecrets.secretId,
        parentId: providerId,
    });

    const store = createStore("s3", secret.parsedSecret);

    const res = await store.uploadUrl(providerId, {
        bucket,
        path: fullPath,
        expiresIn: 60 * 5,
        contentType: input.contentType ?? null,
        cacheControl: null,
        contentDisposition: null,
        metadata: {
            ownerId,
            volumeId: String(volume.id),
        },
    });

    if (!res.ok) {
        throw new Error(res.message || "Failed to generate upload url");
    }

    return {
        providerId,
        bucket,
        path: fullPath,
        ...res.data,
    };
}
