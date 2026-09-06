import { DISTRIBUTION_LAYOUTS } from "@distribution/layouts";

export default function AuthLayout(props: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	return <DISTRIBUTION_LAYOUTS.AuthLayout {...props} />;
}
