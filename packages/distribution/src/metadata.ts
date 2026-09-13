import type { ComponentType } from "react";
import type { Metadata } from "next";

import { DEFAULT_DISTRIBUTION } from "./config";

type DistributionMetadataModule = {
    DISTRIBUTION_METADATA?: Metadata;
    DISTRIBUTION_HEAD?: ComponentType;
};

const modules = import.meta.glob("./*/metadata.tsx", {
    eager: true,
}) as Record<string, DistributionMetadataModule>;

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected = modules[`./${distribution}/metadata.tsx`];
const defaults = modules[`./${DEFAULT_DISTRIBUTION}/metadata.tsx`];

export const DISTRIBUTION_METADATA: Metadata = {
    ...(defaults?.DISTRIBUTION_METADATA ?? {}),
    ...(selected?.DISTRIBUTION_METADATA ?? {}),
};

export const DISTRIBUTION_HEAD =
    selected?.DISTRIBUTION_HEAD ??
    defaults?.DISTRIBUTION_HEAD ??
    (() => null);
