import { smtpAccountSecrets } from "@db";
import { PROVIDERS, parseCustomEmailProviders } from "@schema";
import { Container } from "@/components/common/containers";
import CustomEmailProviderCard from "@/components/dashboard/providers/custom-email-provider-card";
import GoogleCard from "@/components/dashboard/providers/google-card";
import InboundCard from "@/components/dashboard/providers/inbound-card";
import JmapCard from "@/components/dashboard/providers/jmap-card";
import MicrosoftCard from "@/components/dashboard/providers/microsoft-card";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import SMTPCard from "@/components/dashboard/providers/smtp-card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	fetchDecryptedSecrets,
	fetchGoogleAccounts,
	fetchInboundIdentities,
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
		googleOAuthConfigured,
	] = await Promise.all([
		syncProviders(),
		fetchDecryptedSecrets({
			linkTable: smtpAccountSecrets,
			foreignCol: smtpAccountSecrets.accountId,
			secretIdCol: smtpAccountSecrets.secretId,
		}),
		fetchGoogleAccounts(),
		fetchInboundIdentities(),
		fetchJmapAccounts(),
		hasGoogleOAuthConfig(),
	]);
	const customEmailProviders = parseCustomEmailProviders();

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

					{customEmailProviders.length > 0 ? (
						<section className="mb-8">
							<div className="mb-4">
								<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
									Configured email providers
								</h2>
								<p className="mt-1 text-xs text-muted-foreground">
									Server settings are managed by your administrator.
								</p>
							</div>
							<div className="grid gap-6">
								{customEmailProviders.map((provider) => (
									<CustomEmailProviderCard
										key={provider.id}
										provider={provider}
									/>
								))}
							</div>
						</section>
					) : null}

					<div className="grid gap-6 xl:grid-cols-2">
						{PROVIDERS.map((p) => (
							<ProviderCardShell
								key={p.key}
								provisioned={false}
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
						<JmapCard jmapAccounts={jmapAccounts} />
						<MicrosoftCard
							configured={Boolean(process.env.MICROSOFT_CLIENT_ID)}
						/>
					</div>
				</Container>
			</div>
		</>
	);
}
