import { db, driveVolumes } from "@db";
import { eq } from "drizzle-orm";
import { listVolumes } from "./webdav-list";

export const discoverVolumesForOwner = async (ownerId: string) => {
    const discovered = await listVolumes();

    const existing = await db
        .select()
        .from(driveVolumes)
        .where(eq(driveVolumes.ownerId, ownerId));

    const existingByCode = new Map(existing.map((v) => [v.code, v]));
    const discoveredCodes = new Set(discovered.map((v) => v.code));

    const hasDefaultDiskExisting = existing.some(
        (v) => v.isDefault && v.code !== "home",
    );

    let defaultDiskAssigned = hasDefaultDiskExisting;

    const ops: Promise<unknown>[] = [];

    for (const vol of discovered) {
        const found = existingByCode.get(vol.code);

        if (found) {
            ops.push(
                db
                    .update(driveVolumes)
                    .set({
                        basePath: vol.basePath,
                        isAvailable: true,
                        updatedAt: new Date(),
                    })
                    .where(eq(driveVolumes.id, found.id)),
            );
            continue;
        }

        const makeDefault = !defaultDiskAssigned;
        if (makeDefault) defaultDiskAssigned = true;

        ops.push(
            db.insert(driveVolumes).values({
                ownerId,
                kind: "local",
                code: vol.code,
                label: vol.label ?? vol.code,
                basePath: vol.basePath,
                isDefault: makeDefault,
                isAvailable: true,
            }),
        );
    }

    for (const vol of existing) {
        if (vol.kind !== "local") continue;
        if (vol.code === "home") continue;

        if (!discoveredCodes.has(vol.code) && vol.isAvailable) {
            ops.push(
                db
                    .update(driveVolumes)
                    .set({
                        isAvailable: false,
                        updatedAt: new Date(),
                    })
                    .where(eq(driveVolumes.id, vol.id)),
            );
        }
    }

    await Promise.all(ops);

    const finalVolumes = await db
        .select()
        .from(driveVolumes)
        .where(eq(driveVolumes.ownerId, ownerId));

    return finalVolumes;
};
