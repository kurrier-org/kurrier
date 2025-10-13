// @ts-nocheck

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/mailbox/default/app-sidebar";
import { fetchMailbox } from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: any;
}) {
	const { identityPublicId, mailboxSlug = "inbox" } = await params;
	const { activeMailbox, mailboxList, identity } = await fetchMailbox(
		identityPublicId,
		mailboxSlug,
	);
	const publicConfig = await getPublicEnv();

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "225px",
				} as React.CSSProperties
			}
		>
			<AppSidebar
				activeMailbox={activeMailbox}
				mailboxList={mailboxList}
				identity={identity}
				publicConfig={publicConfig}
			/>
			<SidebarInset>
				{/*{breadcrumb}*/}
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
