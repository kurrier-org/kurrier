import { Mail } from "lucide-react";
import { Suspense } from "react";
import Loading from "@/app/loading";
import ContentPlaceholder from "@/components/common/content-placeholder";
import DashboardPageHeader from "@/components/dashboard/dashboard-page-header";
import { getDictionary, type Locale } from "@/lib/dictionaries";

async function MailHomeContent({
	params,
}: {
	params: Promise<{ locale: Locale }>;
}) {
	const { locale } = await params;
	const dict = await getDictionary(locale);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<DashboardPageHeader title={dict.mailbox.mailTitle} />
			<ContentPlaceholder
				icon={<Mail className="size-5" aria-hidden="true" />}
				title={dict.mailbox.chooseMailbox}
				description={dict.mailbox.selectMailboxDescription}
			/>
		</div>
	);
}

export default function Page({
	params,
}: {
	params: Promise<{ locale: Locale }>;
}) {
	return (
		<Suspense fallback={<Loading />}>
			<MailHomeContent params={params} />
		</Suspense>
	);
}
