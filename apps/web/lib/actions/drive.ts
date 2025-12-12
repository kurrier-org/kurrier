"use server";

import {getRedis} from "@/lib/actions/get-redis";
import {isSignedIn} from "@/lib/actions/auth";
import {DriveVolumeEntity} from "@db";

export const fetchVolumes = async () => {
    const { davQueue, davEvents } = await getRedis();
    const user = await isSignedIn();
    const job = await davQueue.add("dav:drive:discover-user-volumes",
        { userId: user?.id },
        {
        removeOnComplete: true,
        removeOnFail: true,
    });

    const vols = await job.waitUntilFinished(davEvents)
    const localVolumes = vols
        .filter((v: DriveVolumeEntity) => v.kind === "local" && v.code !== "home" && v.isAvailable)
        .sort((a: DriveVolumeEntity,b: DriveVolumeEntity) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.label.localeCompare(b.label));
    return localVolumes
};


export const fetchListPath = async (path: string[], isVolume: boolean, publicId?: string) => {
    const { davQueue, davEvents } = await getRedis();
    const user = await isSignedIn();

    const job = await davQueue.add(
        "dav:drive:list-path",
        {
            ownerId: user?.id,
            mode: isVolume ? "volume" : "home",
            segments: path ?? [],
            publicId: isVolume ? publicId : undefined,
        },
        {
            removeOnComplete: true,
            removeOnFail: true,
        },
    );

    return await job.waitUntilFinished(davEvents);
};
