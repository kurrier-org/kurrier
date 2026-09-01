import { DEFAULT_DISTRIBUTION } from "./config";

const schemas = import.meta.glob("./*/schemas.ts", {
    eager: true,
}) as Record<
    string,
    {
        DISTRIBUTION_SCHEMAS: readonly string[];
    }
>;

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const selected = schemas[`./${distribution}/schemas.ts`];

if (!selected) {
    throw new Error(`Distribution schemas not found: ${distribution}`);
}

export const DISTRIBUTION_SCHEMAS = selected.DISTRIBUTION_SCHEMAS;
