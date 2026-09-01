import { type ReactNode, Suspense } from "react";
import { DashboardHeaderLoading } from "@/components/dashboard/dashboard-loading";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";

type LayoutProps = {
	children: ReactNode;
	params: Promise<Record<string, string>>;
};

export default async function DashboardLayout({
	children,
	params,
}: LayoutProps) {
	return (
		<>
			<Suspense fallback={<DashboardHeaderLoading />}>
				<MailboxSearchHeader params={params} />
			</Suspense>
			{children}
		</>
	);
}
