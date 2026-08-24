import { providerSecrets } from "@db";
import type { ProviderSpec } from "@schema";
import ProviderCard from "@/components/dashboard/providers/provider-card";
import ProvisionedProviderCard from "@/components/dashboard/providers/provisioned-provider-card";
import {
	fetchDecryptedSecrets,
	type SyncProvidersRow,
} from "@/lib/actions/dashboard";

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
	if (!userProvider) {
		return null;
	}

	const [decryptedSecret] = await fetchDecryptedSecrets({
		linkTable: providerSecrets,
		foreignCol: providerSecrets.providerId,
		secretIdCol: providerSecrets.secretId,
		parentId: userProvider.id,
	});

	return provisioned ? (
		<ProvisionedProviderCard
			spec={spec}
			userProvider={userProvider}
			decryptedSecret={decryptedSecret}
		/>
	) : (
		<ProviderCard
			spec={spec}
			userProvider={userProvider}
			decryptedSecret={decryptedSecret}
		/>
	);
}
