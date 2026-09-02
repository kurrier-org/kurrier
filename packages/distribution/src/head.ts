import type { ComponentType } from "react";

import { DEFAULT_DISTRIBUTION } from "./config";

const heads = import.meta.glob("./*/head.tsx", {
    eager: true,
}) as Record<
    string,
    {
        DISTRIBUTION_HEAD?: ComponentType;
    }
>;

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected =
    heads[`./${distribution}/head.tsx`]?.DISTRIBUTION_HEAD;

const defaults =
    heads[`./${DEFAULT_DISTRIBUTION}/head.tsx`]?.DISTRIBUTION_HEAD;

export const DISTRIBUTION_HEAD =
    selected ?? defaults ?? (() => null);
