import "server-only";

export const SITE_FEATURES = {
	drive: process.env.DISABLE_DRIVE !== "true",
	localLogin: process.env.DISABLE_LOCAL_LOGIN !== "true",
} as const;

export type SiteFeatures = typeof SITE_FEATURES;
