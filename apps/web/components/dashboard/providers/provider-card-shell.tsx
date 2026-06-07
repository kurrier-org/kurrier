import { ProviderSpec } from "@schema";
import {
	fetchDecryptedSecrets,
	SyncProvidersRow,
} from "@/lib/actions/dashboard";
import ProviderCard from "@/components/dashboard/providers/provider-card";
import { providerSecrets } from "@db";

type Props = {
	userProviders: SyncProvidersRow[];
	spec: ProviderSpec;
};

export default async function ProviderCardShell({
	userProviders,
	spec,
}: Props) {
	const userProvider = userProviders.find((p) => p.type === spec.key);

	const [decryptedSecret] = await fetchDecryptedSecrets({
		linkTable: providerSecrets,
		foreignCol: providerSecrets.providerId,
		secretIdCol: providerSecrets.secretId,
		parentId: String(userProvider?.id),
	});

	if (userProvider) {
		return (
			<ProviderCard
				spec={spec}
				userProvider={userProvider}
				decryptedSecret={decryptedSecret}
			/>
		);
	} else {
		return <div>No Providers Found</div>;
	}
}
