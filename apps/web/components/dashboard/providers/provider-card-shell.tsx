import { ProviderSpec } from "@schema";
import {
	fetchDecryptedSecrets,
	SyncProvidersRow,
} from "@/lib/actions/dashboard";
import ProviderCard from "@/components/dashboard/providers/provider-card";
import { providerSecrets } from "@db";
import ProvisionedProviderCard from "@/components/dashboard/providers/provisioned-provider-card";
import { getDictionary } from "@/lib/dictionaries";
import { cookies } from "next/headers";

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
	const cookieStore = await cookies();
	const dict = await getDictionary(cookieStore.get("locale")?.value ?? "en");
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
		return <div>{dict.platform.noProvidersFound}</div>;
	}
}
