import type { Metadata } from "next";

import { DEFAULT_DISTRIBUTION } from "./config";

const metadata = import.meta.glob("./*/metadata.ts", {
    eager: true,
}) as Record<
    string,
    {
        DISTRIBUTION_METADATA?: Metadata;
    }
>;

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected =
    metadata[`./${distribution}/metadata.ts`]?.DISTRIBUTION_METADATA;

const defaults =
    metadata[`./${DEFAULT_DISTRIBUTION}/metadata.ts`]
        ?.DISTRIBUTION_METADATA;

export const DISTRIBUTION_METADATA: Metadata = {
    ...(defaults ?? {}),
    ...(selected ?? {}),
};
