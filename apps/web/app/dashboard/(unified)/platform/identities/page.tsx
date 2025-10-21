import React from "react";
import MailIdentities from "@/components/dashboard/identities/mail-identities";
import {
	fetchDecryptedSecrets,
	fetchUserIdentities,
	getProviderById,
} from "@/lib/actions/dashboard";
import { smtpAccountSecrets, providerSecrets } from "@db";
import { ProviderLabels } from "@schema";
import { parseSecret } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

async function Page() {
	const [userSmtpAccounts, userProviderAccounts] = await Promise.all([
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
	const userIdentities = await fetchUserIdentities();

	const options = [];
	for (const providerAccount of userProviderAccounts) {
		const secret = parseSecret(providerAccount);
		if (secret.verified) {
			const provider = await getProviderById(
				String(providerAccount.linkRow.providerId),
			);
			const providerName =
				ProviderLabels[provider?.type || "unknown"] || "Unknown Provider";
			if (provider) {
				options.push({
					label: providerName,
					value: `provider-${String(providerAccount.linkRow.id)}`,
				});
			}
		}
	}
	for (const smtpAccount of userSmtpAccounts) {
		const secret = parseSecret(smtpAccount);
		if (secret.sendVerified || secret.receiveVerified) {
			options.push({
				label: `SMTP Account (${secret.label})`,
				value: `smtp-${String(smtpAccount.linkRow.id)}`,
			});
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
				<MailIdentities
					userIdentities={userIdentities}
					smtpAccounts={userSmtpAccounts}
					providerAccounts={userProviderAccounts}
					providerOptions={options}
				/>
			</div>
		</>
	);
}

export default Page;
