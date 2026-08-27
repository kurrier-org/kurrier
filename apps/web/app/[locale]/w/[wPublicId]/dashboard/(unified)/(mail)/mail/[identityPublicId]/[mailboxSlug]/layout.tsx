import React, { ReactNode, Suspense } from "react";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";
import Loading from "@/app/loading";

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
			<Suspense fallback={<Loading />}>
				<MailboxSearchHeader params={params} />
			</Suspense>

			{thread}
			{children}
		</>
	);
}
