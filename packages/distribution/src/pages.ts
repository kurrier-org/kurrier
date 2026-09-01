import { DEFAULT_DISTRIBUTION } from "./config";

const pages = import.meta.glob("./*/pages/index.ts", {
    eager: true,
}) as Record<string, Record<string, any>>;

const distribution = process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;
const selected = pages[`./${distribution}/pages/index.ts`];
if (!selected) {
    throw new Error(`Distribution pages not found: ${distribution}`);
}

const defaults = pages[`./${DEFAULT_DISTRIBUTION}/pages/index.ts`];

if (!defaults) {
    throw new Error(
        `Default distribution pages not found: ${DEFAULT_DISTRIBUTION}`,
    );
}

export const DISTRIBUTION_PAGES = {
    ...defaults,
    ...selected,
};
