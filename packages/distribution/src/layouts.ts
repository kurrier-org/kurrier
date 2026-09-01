import { DEFAULT_DISTRIBUTION } from "./config";

const layouts = import.meta.glob("./*/layouts/index.ts", {
    eager: true,
}) as Record<string, Record<string, any>>;

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected = layouts[`./${distribution}/layouts/index.ts`];

if (!selected) {
    throw new Error(`Distribution layouts not found: ${distribution}`);
}

const defaults = layouts[`./${DEFAULT_DISTRIBUTION}/layouts/index.ts`];

if (!defaults) {
    throw new Error(
        `Default distribution layouts not found: ${DEFAULT_DISTRIBUTION}`,
    );
}

export const DISTRIBUTION_LAYOUTS = {
    ...defaults,
    ...selected,
};
