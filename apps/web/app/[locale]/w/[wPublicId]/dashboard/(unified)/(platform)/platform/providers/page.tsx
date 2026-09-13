import { smtpAccountSecrets } from "@db";
import { PROVIDERS } from "@schema";
import { DISTRIBUTION_CONFIG } from "@distribution";

import { Container } from "@/components/common/containers";
import AddCustomEmailProviderButton from "@/components/dashboard/providers/add-custom-email-provider-button";
import CustomEmailProviderCard from "@/components/dashboard/providers/custom-email-provider-card";
import GoogleCard from "@/components/dashboard/providers/google-card";
import InboundCard from "@/components/dashboard/providers/inbound-card";
import JmapCard from "@/components/dashboard/providers/jmap-card";
import MailtrapCardShell from "@/components/dashboard/providers/mailtrap-card-shell";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import SMTPCard from "@/components/dashboard/providers/smtp-card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	fetchCustomEmailProviders,
	fetchDecryptedSecrets,
	fetchGoogleAccounts,
	fetchProviderIdentities,
	hasGoogleOAuthConfig,
	syncProviders,
} from "@/lib/actions/dashboard";
import { fetchJmapAccounts } from "@/lib/actions/jmap-actions";
import { getDictionary } from "@/lib/dictionaries";

export default async function ProvidersPage({
												params,
											}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const dict = await getDictionary(locale);

	const [
		userProviders,
		smtpSecrets,
		googleAccounts,
		inboundIdentities,
		jmapAccounts,
		mailtrapIdentities,
		googleOAuthConfigured,
		customEmailProviders,
	] = await Promise.all([
		syncProviders(),
		fetchDecryptedSecrets({
			linkTable: smtpAccountSecrets,
			foreignCol: smtpAccountSecrets.accountId,
			secretIdCol: smtpAccountSecrets.secretId,
		}),
		fetchGoogleAccounts(),
		fetchProviderIdentities("inbound"),
		DISTRIBUTION_CONFIG.features.jmap
			? fetchJmapAccounts()
			: Promise.resolve([]),
		fetchProviderIdentities("mailtrap"),
		hasGoogleOAuthConfig(),
		fetchCustomEmailProviders(),
	]);

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
					<div className="my-4 flex items-center justify-between">
						<h1 className="text-xl font-bold text-foreground">
							{dict.platform.providers}
						</h1>
					</div>

					<p className="my-6 max-w-prose text-sm text-muted-foreground">
						{dict.platform.providersPageDescription}
					</p>

					<section className="mb-8 rounded-xl border bg-card">
						<div className="flex items-start justify-between gap-4 border-b px-5 py-4">
							<div>
								<h2 className="text-sm font-semibold text-foreground">
									Configured email providers
								</h2>

								<p className="mt-1 text-xs text-muted-foreground">
									Preconfigure SMTP and IMAP servers that workspace members can
									connect to.
								</p>
							</div>

							<AddCustomEmailProviderButton />
						</div>

						<div className="p-5">
							{customEmailProviders.length > 0 ? (
								<div className="grid gap-4">
									{customEmailProviders.map((provider) => (
										<CustomEmailProviderCard
											key={provider.id}
											provider={provider}
										/>
									))}
								</div>
							) : (
								<div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-5 text-center">
									<div>
										<p className="text-sm font-medium text-foreground">
											No email providers configured
										</p>

										<p className="mt-1 text-xs text-muted-foreground">
											Add a provider to make its server settings available to this
											workspace.
										</p>
									</div>
								</div>
							)}
						</div>
					</section>

					<div className="grid gap-6 xl:grid-cols-2">
						{PROVIDERS.map((p) => (
							<ProviderCardShell
								key={p.key}
								mode="configurable"
								spec={p}
								userProviders={userProviders}
							/>
						))}
					</div>

					<div className="my-8 grid gap-6 xl:grid-cols-2">
						<SMTPCard smtpSecrets={smtpSecrets} />

						<GoogleCard
							googleAccounts={googleAccounts}
							googleOAuthConfigured={googleOAuthConfigured}
						/>

						<InboundCard inboundIdentities={inboundIdentities} />

						{DISTRIBUTION_CONFIG.features.jmap && (
							<JmapCard jmapAccounts={jmapAccounts} />
						)}

						<MailtrapCardShell
							userProviders={userProviders}
							mailtrapIdentities={mailtrapIdentities}
						/>
					</div>
				</Container>
			</div>
		</>
	);
}
