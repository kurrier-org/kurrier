import { ProviderSpec } from "@schema";
import {
	fetchDecryptedSecrets,
	SyncProvidersRow,
} from "@/lib/actions/dashboard";
import ProviderCard from "@/components/dashboard/providers/provider-card";
import { providerSecrets } from "@db";
import ProvisionedProviderCard from "@/components/dashboard/providers/provisioned-provider-card";

type Props = {
	userProviders: SyncProvidersRow[];
	provisioned: boolean;
	spec: ProviderSpec;
};

export default async function ProviderCardShell({
	userProviders,
	provisioned,
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
			provisioned ?
				<ProvisionedProviderCard
					spec={spec}
					userProvider={userProvider}
					decryptedSecret={decryptedSecret} /> :
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
