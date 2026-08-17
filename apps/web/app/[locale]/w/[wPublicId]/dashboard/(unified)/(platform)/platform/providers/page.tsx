import * as React from "react";
import { Container } from "@/components/common/containers";
import { parseCustomEmailProviders, PROVIDERS } from "@schema";
import SMTPCard from "@/components/dashboard/providers/smtp-card";
import {fetchDecryptedSecrets, fetchGoogleAccounts, syncProviders, fetchInboundIdentities} from "@/lib/actions/dashboard";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import { smtpAccountSecrets } from "@db";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {fetchWorkspace} from "@/lib/actions/workspace";
import GoogleCard from "@/components/dashboard/providers/google-card";
import InboundCard from "@/components/dashboard/providers/inbound-card";
import CustomEmailProviderCard from "@/components/dashboard/providers/custom-email-provider-card";

export default async function ProvidersPage() {
	const userProviders = await syncProviders();

	const smtpSecrets = await fetchDecryptedSecrets({
		linkTable: smtpAccountSecrets,
		foreignCol: smtpAccountSecrets.accountId,
		secretIdCol: smtpAccountSecrets.secretId,
	});

	const googleAccounts = await fetchGoogleAccounts();
	const workspaceId = await fetchWorkspace().then((workspace) => workspace.id);
	const inboundIdentities = await fetchInboundIdentities();
	const customEmailProviders = parseCustomEmailProviders(
		process.env.CUSTOM_EMAIL_PROVIDERS,
	);

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
						<h1 className="text-xl font-bold text-foreground">Providers</h1>
					</div>

					<p className="max-w-prose text-sm text-muted-foreground my-6">
						Connect email providers directly from the dashboard — no manual
						environment setup required. All provider credentials are securely
						encrypted and stored in the Vault, never in plain text or source
						code ensuring full control and privacy.
					</p>

					{customEmailProviders.length > 0 ? (
						<section className="mb-8">
							<div className="mb-4">
								<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
									Company email providers
								</h2>
								<p className="mt-1 text-xs text-muted-foreground">
									Server settings are managed by your administrator.
								</p>
							</div>
							<div className="grid gap-6 lg:grid-cols-2">
								{customEmailProviders.map((provider) => (
									<CustomEmailProviderCard
										key={provider.id}
										provider={provider}
									/>
								))}
							</div>
						</section>
					) : null}

					<div className="grid gap-6 lg:grid-cols-2">
						{PROVIDERS.map((p) => (
							<ProviderCardShell
								key={p.key}
								provisioned={false}
								spec={p}
								userProviders={userProviders}
							/>
						))}
					</div>
					<div className="grid gap-6 lg:grid-cols-2 my-8">
						<SMTPCard smtpSecrets={smtpSecrets} />
						<GoogleCard googleAccounts={googleAccounts} />
						<InboundCard inboundIdentities={inboundIdentities} />
					</div>
				</Container>
			</div>
		</>
	);
}
