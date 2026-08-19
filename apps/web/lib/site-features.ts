import "server-only";

export const SITE_FEATURES = {
	drive: process.env.DISABLE_DRIVE !== "true",
} as const;

export type SiteFeatures = typeof SITE_FEATURES;
