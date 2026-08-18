import { smtpAccountSecrets } from "@db";
import { PROVIDERS } from "@schema";
import * as React from "react";
import { Container } from "@/components/common/containers";
import GoogleCard from "@/components/dashboard/providers/google-card";
import InboundCard from "@/components/dashboard/providers/inbound-card";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import SMTPCard from "@/components/dashboard/providers/smtp-card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	fetchDecryptedSecrets,
	fetchGoogleAccounts,
	fetchInboundIdentities,
	syncProviders,
} from "@/lib/actions/dashboard";
import { fetchWorkspace } from "@/lib/actions/workspace";
import { getDictionary } from "@/lib/dictionaries";

export default async function ProvidersPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const dict = await getDictionary(locale);
	const userProviders = await syncProviders();

	const smtpSecrets = await fetchDecryptedSecrets({
		linkTable: smtpAccountSecrets,
		foreignCol: smtpAccountSecrets.accountId,
		secretIdCol: smtpAccountSecrets.secretId,
	});

	const googleAccounts = await fetchGoogleAccounts();
	const workspaceId = await fetchWorkspace().then((workspace) => workspace.id);
	const inboundIdentities = await fetchInboundIdentities();

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
							{dict.platform.providers}
						</h1>
					</div>

					<p className="max-w-prose text-sm text-muted-foreground my-6">
						{dict.platform.providersPageDescription}
					</p>

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
