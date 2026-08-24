import { driveVolumes, providerSecrets, smtpAccountSecrets } from "@db";
import { ProviderLabels, STORAGE_PROVIDERS } from "@schema";
import { redirect } from "next/navigation";
import * as React from "react";
import { Container } from "@/components/common/containers";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import VolumesManager from "@/components/dashboard/storage/volumes-manager";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getWorkspacePublicId, rlsClient } from "@/lib/actions/clients";
import {
	fetchDecryptedSecrets,
	getProviderById,
	syncProviders,
} from "@/lib/actions/dashboard";
import { getDictionary } from "@/lib/dictionaries";
import { SITE_FEATURES } from "@/lib/site-features";
import { parseSecret } from "@/lib/utils";

export default async function ProvidersPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const dict = await getDictionary(locale);
	const workspacePublicId = await getWorkspacePublicId();
	if (!SITE_FEATURES.drive) {
		redirect(`/${locale}/w/${workspacePublicId}/dashboard/platform/overview`);
	}

	const userProviders = await syncProviders();
	const rls = await rlsClient();
	const vols = await rls((tx) => tx.select().from(driveVolumes));
	const [, userProviderAccounts] = await Promise.all([
		fetchDecryptedSecrets({
			linkTable: smtpAccountSecrets,
			foreignCol: smtpAccountSecrets.accountId,
			secretIdCol: smtpAccountSecrets.secretId,
		}),
		fetchDecryptedSecrets({
			linkTable: providerSecrets,
			foreignCol: providerSecrets.providerId,
			secretIdCol: providerSecrets.secretId,
		}),
	]);

	const options = [];
	for (const providerAccount of userProviderAccounts) {
		const secret = parseSecret(providerAccount);
		if (secret.verified) {
			const provider = await getProviderById(
				String(providerAccount.linkRow.providerId),
			);
			const providerTypeKey = provider?.type
				? `providerName${provider.type.charAt(0).toUpperCase()}${provider.type.slice(1)}`
				: null;
			const providerName =
				(providerTypeKey &&
					(dict.platform as Record<string, string>)[providerTypeKey]) ||
				ProviderLabels[provider?.type || "unknown"] ||
				dict.platform.unknownProvider;
			if (provider) {
				options.push({
					label: providerName,
					value: String(providerAccount.providerId),
				});
			}
		}
	}

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
				</div>
			</header>
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<Container variant="wide">
					<div className="flex items-center justify-between my-4">
						<h1 className="text-xl font-bold text-foreground">
							{dict.platform.storageProviders}
						</h1>
					</div>

					<p className="max-w-prose text-sm text-muted-foreground my-6">
						{dict.platform.storageProvidersPageDescription}
					</p>

					<div className="grid gap-6 lg:grid-cols-2">
						{STORAGE_PROVIDERS.map((p) => (
							<ProviderCardShell
								key={p.key}
								provisioned={true}
								spec={p}
								userProviders={userProviders}
							/>
						))}
					</div>
				</Container>
				<div className={"mx-1"}>
					<VolumesManager
						userProviders={userProviders}
						workspacePublicId={workspacePublicId}
						volumes={vols}
						provisioned={true}
						providerSelectOptions={options}
					/>
				</div>
			</div>
		</>
	);
}
