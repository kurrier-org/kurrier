import { $fetch } from "ofetch";
import { listVolumes } from "../../dav/drive/webdav-list";

async function ensureCollection(path: string) {
    const url = process.env.WEB_DAV_URL + path;
    try {
        await $fetch.raw(url, {
            method: "MKCOL",
        });
        console.log("[DAV DRIVE] Created collection:", path);
    } catch (err: any) {
        const status =
            err?.response?.status ??
            err?.statusCode ??
            err?.status ??
            null;

        if (status === 405 || status === 409) {
            console.log("[DAV DRIVE] Collection already exists:", path);
            return;
        }


        console.error("[DAV DRIVE] MKCOL failed for", path, status, err?.message ?? err);
        throw err;
    }
}


export const ensureUserFoldersInDisks = async (userId: string) => {
    let volumes = [];
    try {
        volumes = await listVolumes();
    } catch (err: any) {
        const status = err?.response?.status ?? err?.statusCode ?? err?.status ?? null;
        if (status === 404) return;
        throw err;
    }

    for (const v of volumes) {
        await ensureCollection(`/disks/${v.code}/users/`);
        await ensureCollection(`/disks/${v.code}/users/${userId}/`);
    }
};


const seedDefaultUserDavFolder = async (userId: string) => {
    await ensureCollection("/users/");
    const userFolderPath = `/users/${userId}/`;
    await ensureCollection(userFolderPath);
    await ensureUserFoldersInDisks(userId);
};

export default async function seed({ userId }: { userId: string }) {
    await seedDefaultUserDavFolder(userId);
    console.info("Migration 0.0.99 - seed.ts executed");
}
