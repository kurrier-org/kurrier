import { providerSecrets } from "@db";
import type { ProviderSpec } from "@schema";
import ProviderCard from "@/components/dashboard/providers/provider-card";
import ManagedProviderCard from "@/components/dashboard/providers/managed-provider-card";
import {
	fetchDecryptedSecrets,
	type SyncProvidersRow,
} from "@/lib/actions/dashboard";

type Props = {
	userProviders: SyncProvidersRow[];
	mode: "managed" | "configurable";
	spec: ProviderSpec;
};

export default async function ProviderCardShell({
													userProviders,
													mode,
													spec,
												}: Props) {
	const userProvider = userProviders.find((p) => p.type === spec.key);

	if (!userProvider) {
		return null;
	}

	if (mode === "managed") {
		return <ManagedProviderCard spec={spec} />;
	}

	const [decryptedSecret] = await fetchDecryptedSecrets({
		linkTable: providerSecrets,
		foreignCol: providerSecrets.providerId,
		secretIdCol: providerSecrets.secretId,
		parentId: userProvider.id,
	});

	return (
		<ProviderCard
			spec={spec}
			userProvider={userProvider}
			decryptedSecret={decryptedSecret}
		/>
	);
}
