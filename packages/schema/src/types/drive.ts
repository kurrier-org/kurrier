import { DriveVolumeEntity } from "@db";

export const driveVolumesList = [
    "local",
    "cloud",
] as const;
export const driveEntryTypes = ["file", "folder"] as const;

export type DriveState = {
    volumes: DriveVolumeEntity[]
};
