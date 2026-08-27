import { providerSecrets } from "@db";
import { getPublicEnv } from "@schema";
import MailtrapCard from "@/components/dashboard/providers/mailtrap-card";
import {
	fetchDecryptedSecrets,
	type FetchProviderIdentitiesResult,
	type SyncProvidersRow,
} from "@/lib/actions/dashboard";
import { kvGet } from "@common";

export default async function MailtrapCardShell({
	userProviders,
	mailtrapIdentities,
}: {
	userProviders: SyncProvidersRow[];
	mailtrapIdentities: FetchProviderIdentitiesResult;
}) {
	const provider = userProviders.find((p) => p.type === "mailtrap");
	if (!provider) {
		return null;
	}

	const { WEB_URL } = getPublicEnv();
	const localTunnelUrl = await kvGet("local-tunnel-url");
	const webhookUrl = `${localTunnelUrl ? localTunnelUrl : WEB_URL}/api/v1/hooks/mailtrap/${provider.id}`;

	const [decryptedSecret] = await fetchDecryptedSecrets({
		linkTable: providerSecrets,
		foreignCol: providerSecrets.providerId,
		secretIdCol: providerSecrets.secretId,
		parentId: provider.id,
	});

	return (
		<MailtrapCard
			providerId={provider.id}
			webhookUrl={webhookUrl}
			mailtrapIdentities={mailtrapIdentities}
			decryptedSecret={decryptedSecret}
		/>
	);
}
