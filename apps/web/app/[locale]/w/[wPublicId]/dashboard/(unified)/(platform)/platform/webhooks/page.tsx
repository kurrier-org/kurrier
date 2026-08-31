import { Plus, Webhook } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/common/containers";
import ContentPlaceholder from "@/components/common/content-placeholder";
import DashboardPageHeader from "@/components/dashboard/dashboard-page-header";
import ManageWebhooks from "@/components/dashboard/webhooks/manage-webhooks";
import { Button } from "@/components/ui/button";
import { fetchUserWebhooks } from "@/lib/actions/dashboard";
import { fetchIdentityMailboxList } from "@/lib/actions/mailbox";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function Page({
	params,
}: {
	params: Promise<{ locale: Locale; wPublicId: string }>;
}) {
	const { locale, wPublicId } = await params;
	const [dict, webhooksList, identityMailboxes] = await Promise.all([
		getDictionary(locale),
		fetchUserWebhooks(),
		fetchIdentityMailboxList(),
	]);

	const identitiesOptions = identityMailboxes.map((identityMailbox) => ({
		label: `${identityMailbox.identity.displayName} <${identityMailbox.identity.value}>`,
		value: identityMailbox.identity.id,
	}));
	const hasIdentities = identitiesOptions.length > 0;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<DashboardPageHeader title={dict.platform.webhooks} />

			{hasIdentities ? (
				<div className="min-h-0 flex-1 overflow-y-auto">
					<Container variant="wide" className="py-6 sm:py-8">
						<p className="mb-6 max-w-prose text-sm leading-6 text-muted-foreground">
							{dict.platform.webhooksDescription}
						</p>
						<ManageWebhooks
							hooksList={webhooksList}
							identitiesOptions={identitiesOptions}
						/>
					</Container>
				</div>
			) : (
				<ContentPlaceholder
					icon={<Webhook className="size-5" aria-hidden="true" />}
					title={dict.platform.noIdentitiesAvailableForWebhooks}
					description={dict.platform.webhooksDescription}
					action={
						<Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
							<Link href={`/w/${wPublicId}/dashboard/platform/identities`}>
								<Plus className="size-4" aria-hidden="true" />
								{dict.platform.createIdentity}
							</Link>
						</Button>
					}
				/>
			)}
		</div>
	);
}
