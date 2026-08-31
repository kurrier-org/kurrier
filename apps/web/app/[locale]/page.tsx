import { DistributionLandingPage } from "@distribution/pages";
import { getDefaultWorkspacePath, isSignedIn } from "@/lib/actions/auth";

export default async function LocaleRootPage({
												 params,
											 }: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const user = await isSignedIn();

	const workspacePath = user
		? await getDefaultWorkspacePath(user)
		: null;

	return (
		<DistributionLandingPage
			locale={locale}
			workspacePath={workspacePath}
		/>
	);
}
