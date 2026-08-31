import { Container } from "@/components/common/containers";
import ManageApiKeys from "@/components/dashboard/api-keys/manage-api-keys";
import DashboardPageHeader from "@/components/dashboard/dashboard-page-header";
import { fetchUserAPIKeys } from "@/lib/actions/dashboard";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function Page({
	params,
}: {
	params: Promise<{ locale: Locale }>;
}) {
	const { locale } = await params;
	const [dict, apiKeysList] = await Promise.all([
		getDictionary(locale),
		fetchUserAPIKeys(),
	]);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<DashboardPageHeader title={dict.platform.apiKeys} />
			<div className="min-h-0 flex-1 overflow-y-auto">
				<Container variant="wide" className="py-6 sm:py-8">
					<p className="mb-6 max-w-prose text-sm leading-6 text-muted-foreground">
						{dict.platform.apiKeysDescription}
					</p>
					<ManageApiKeys apiKeysList={apiKeysList} />
				</Container>
			</div>
		</div>
	);
}
