import { getPublicEnv } from "@schema";
import type * as React from "react";
import { Suspense } from "react";
import {
	DASHBOARD_SIDEBAR_WIDTHS,
	DashboardSidebarFooterLoading,
	DashboardSidebarLoading,
	DashboardSidebarSectionLoading,
} from "@/components/dashboard/dashboard-loading";
import IdentityMailboxesListWrapper from "@/components/dashboard/workspaces/identity-mailboxes-list-wrapper";
import MailComposerLauncher from "@/components/mailbox/default/composer/mail-composer-launcher";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { fetchIdentityMailboxList } from "@/lib/actions/mailbox";

async function MailSidebar() {
	const publicConfig = getPublicEnv();
	const workspacePublicId = await getWorkspacePublicId();
	const identityMailboxes = await fetchIdentityMailboxList();

	const sendableIdentityMailboxes = identityMailboxes.filter(
		(item) => item.identity?.metaData?.provider !== "inbound",
	);

	return (
		<AppSidebar
			workspacePublicId={workspacePublicId}
			style={
				{
					"--sidebar-width": DASHBOARD_SIDEBAR_WIDTHS.mail,
				} as React.CSSProperties
			}
			sidebarTopContent={
				<div className="-mt-1" key="mail-sidebar-compose">
					{sendableIdentityMailboxes.length > 0 && (
						<MailComposerLauncher
							publicConfig={publicConfig}
							identityMailboxes={sendableIdentityMailboxes}
						/>
					)}
				</div>
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
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Suspense
				fallback={
					<DashboardSidebarLoading
						sidebarWidth={DASHBOARD_SIDEBAR_WIDTHS.mail}
					/>
				}
			>
				<MailSidebar />
			</Suspense>

			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
