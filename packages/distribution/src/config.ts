type DistributionConfig = {
    id: string;
    locales: readonly string[];
    defaultLocale: string;
    features: {
        drive: boolean;
        localLogin: boolean;
    };
};
const configs = import.meta.glob("./*/config.ts", {
    eager: true,
}) as Record<
    string,
    {
        DISTRIBUTION_CONFIG: DistributionConfig;
    }
>;
export const DEFAULT_DISTRIBUTION = "oss" as const;
const distribution = process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;
const selected = configs[`./${distribution}/config.ts`];
if (!selected) {
    throw new Error(`Distribution config not found: ${distribution}`);
}

export const DISTRIBUTION_CONFIG = selected.DISTRIBUTION_CONFIG;
