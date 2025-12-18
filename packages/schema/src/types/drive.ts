import { DriveVolumeEntity } from "@db";

export const driveVolumesList = ["local", "cloud"] as const;
export const driveEntryTypes = ["file", "folder"] as const;

export const driveUploadIntentTypes = ["home", "cloud"] as const;

export type DriveState = {
	localVolumes: DriveVolumeEntity[];
	cloudVolumes: DriveVolumeEntity[];
	driveRouteContext: DriveRouteContext | null;
	userId: string;
};

export type DriveRouteContext = {
	scope: "home" | "cloud";
	within: string[];
	withinPath: string;
	driveVolume: DriveVolumeEntity | null;
};
