import { type ReactNode, Suspense } from "react";
import { DashboardHeaderLoading } from "@/components/dashboard/dashboard-loading";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";

type LayoutProps = {
	children: ReactNode;
	thread: ReactNode;
	params: Promise<{
		identityPublicId: string;
		mailboxSlug: string;
	}>;
};

export default function DashboardLayout({
	children,
	thread,
	params,
}: LayoutProps) {
	return (
		<>
			<Suspense fallback={<DashboardHeaderLoading />}>
				<MailboxSearchHeader params={params} />
			</Suspense>

			{thread}
			{children}
		</>
	);
}
