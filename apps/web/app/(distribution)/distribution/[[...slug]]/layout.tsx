import { DISTRIBUTION_LAYOUTS } from "@distribution/layouts";

export default function AuthLayout(props: {
    children: React.ReactNode;
    params: Promise<{ slug?: string[] }>;
}) {
    return <DISTRIBUTION_LAYOUTS.DistributionLayout {...props} />;
}
