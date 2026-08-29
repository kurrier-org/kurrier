import SectionCard from "@/components/mailbox/settings/settings-section-card";
import WebPushSettings from "@/components/mailbox/settings/web-push-settings";
import { getWebPushConfig } from "@/lib/actions/web-push";
import { getDictionary, type Locale } from "@/lib/dictionaries";

async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
	const { locale } = await params;
	const dict = await getDictionary(locale);
	const push = await getWebPushConfig();

	return (
		<SectionCard
			title={dict.mailbox.subscriptionsTitle}
			description={dict.mailbox.subscriptionsDescription}
		>
			<div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
				{dict.mailbox.subscriptionsPlaceholder}
				<div className="mt-4">
					<WebPushSettings publicKey={push.publicKey} />
				</div>
			</div>
		</SectionCard>
	);
}

export default Page;
