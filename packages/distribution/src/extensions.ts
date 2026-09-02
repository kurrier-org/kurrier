import type { KurrierExtension } from "@extensions";

import { DEFAULT_DISTRIBUTION } from "./config";

type DistributionExtensionModule = {
    extensions?: KurrierExtension[];
};

const modules = import.meta.glob("./*/extensions.ts", {
    eager: true,
}) as Record<string, DistributionExtensionModule>;

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected = modules[`./${distribution}/extensions.ts`];
const defaults = modules[`./${DEFAULT_DISTRIBUTION}/extensions.ts`];

export const DISTRIBUTION_EXTENSIONS = [
    ...(defaults?.extensions ?? []),
    ...(distribution === DEFAULT_DISTRIBUTION
        ? []
        : selected?.extensions ?? []),
];
