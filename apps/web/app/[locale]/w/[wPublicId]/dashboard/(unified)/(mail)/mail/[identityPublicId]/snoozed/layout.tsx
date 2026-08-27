import React, {ReactNode, Suspense} from "react";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";
import Loading from "@/app/loading";

type LayoutProps = {
	children: ReactNode;
	params: Promise<Record<string, string>>;
};

export default async function DashboardLayout({
	children,
	params,
}: LayoutProps) {

    return <>
		<Suspense fallback={<Loading />}>
			<MailboxSearchHeader params={params} />
		</Suspense>
        {children}
    </>
}
