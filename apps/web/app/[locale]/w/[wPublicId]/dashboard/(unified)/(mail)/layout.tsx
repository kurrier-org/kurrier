import { getPublicEnv } from "@schema";
import type * as React from "react";
import { Suspense } from "react";
import {
	DASHBOARD_SIDEBAR_WIDTHS,
	DashboardSidebarActionLoading,
	DashboardSidebarFooterLoading,
	DashboardSidebarSectionLoading,
} from "@/components/dashboard/dashboard-loading";
import IdentityMailboxesListWrapper from "@/components/dashboard/workspaces/identity-mailboxes-list-wrapper";
import MailComposerLauncher from "@/components/mailbox/default/composer/mail-composer-launcher";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { fetchIdentityMailboxList } from "@/lib/actions/mailbox";

async function MailSidebarAction() {
	const publicConfig = getPublicEnv();
	const identityMailboxes = await fetchIdentityMailboxList();

	const sendableIdentityMailboxes = identityMailboxes.filter(
		(item) => item.identity?.metaData?.provider !== "inbound",
	);

	return (
		<div className="-mt-1" key="mail-sidebar-compose">
			{sendableIdentityMailboxes.length > 0 && (
				<MailComposerLauncher
					publicConfig={publicConfig}
					identityMailboxes={sendableIdentityMailboxes}
				/>
			)}
		</div>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<AppSidebar
				style={
					{
						"--sidebar-width": DASHBOARD_SIDEBAR_WIDTHS.mail,
					} as React.CSSProperties
				}
				sidebarTopContent={
					<Suspense fallback={<DashboardSidebarActionLoading />}>
						<MailSidebarAction />
					</Suspense>
				}
				navUserContent={
					<Suspense fallback={<DashboardSidebarFooterLoading />}>
						<NavUserWrapper />
					</Suspense>
				}
				sidebarSectionContent={
					<Suspense fallback={<DashboardSidebarSectionLoading />}>
						<IdentityMailboxesListWrapper />
					</Suspense>
				}
			/>

			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
