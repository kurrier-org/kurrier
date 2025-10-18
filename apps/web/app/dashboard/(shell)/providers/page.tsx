import * as React from "react";
import { Container } from "@/components/common/containers";
import { PROVIDERS } from "@schema";
import SMTPCard from "@/components/dashboard/providers/smtp-card";
import { fetchDecryptedSecrets, syncProviders } from "@/lib/actions/dashboard";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import { smtpAccountSecrets } from "@db";

export default async function ProvidersPage() {
	const userProviders = await syncProviders();

	const smtpSecrets = await fetchDecryptedSecrets({
		linkTable: smtpAccountSecrets,
		foreignCol: smtpAccountSecrets.accountId,
		secretIdCol: smtpAccountSecrets.secretId,
	});

	return (
		<Container variant="wide">
			<div className="flex items-center justify-between my-4">
				<h1 className="text-xl font-bold text-foreground">Providers</h1>
			</div>

			<p className="max-w-prose text-sm text-muted-foreground my-6">
                Connect email providers directly from the dashboard — no manual environment setup required.
                All provider credentials are securely encrypted and stored in the Vault, never in plain text or source code ensuring full control and privacy.
			</p>

			<div className="grid gap-6 lg:grid-cols-2">
				{PROVIDERS.map((p) => (
					<ProviderCardShell
						key={p.key}
						spec={p}
						userProviders={userProviders}
					/>
				))}
			</div>
			<div className="grid gap-6 my-8">
				<SMTPCard smtpSecrets={smtpSecrets} />
			</div>
		</Container>
	);
}
