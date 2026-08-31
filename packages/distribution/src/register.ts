import { DEFAULT_DISTRIBUTION } from "./config";
type DistributionRegistrar = () => void;

const registrars = import.meta.glob("./*/register.ts", {
    eager: true,
    import: "registerDistribution",
}) as Record<string, DistributionRegistrar>;

const distribution = process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

const registerDistribution =
    registrars[`./${distribution}/register.ts`];

if (!registerDistribution) {
    throw new Error(`Distribution registrar not found: ${distribution}`);
}

export { registerDistribution };
