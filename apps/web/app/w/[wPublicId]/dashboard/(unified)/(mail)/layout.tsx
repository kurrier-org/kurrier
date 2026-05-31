import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { getPublicEnv } from "@schema";
import * as React from "react";
import ComposeMail from "@/components/mailbox/default/compose-mail";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {Suspense} from "react";
import Loading from "@/app/loading";
import IdentityMailboxesListWrapper from "@/components/dashboard/workspaces/identity-mailboxes-list-wrapper";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import {fetchIdentityMailboxList} from "@/lib/actions/mailbox";

export default async function DashboardLayout({
	children
}: {
	children: React.ReactNode;
}) {
	const publicConfig = getPublicEnv();
	const workspacePublicId = await getWorkspacePublicId()
	const identityMailboxes = await fetchIdentityMailboxList();

	return (
		<>
			<AppSidebar
				workspacePublicId={workspacePublicId}
				sidebarTopContent={
					<Suspense fallback={<Loading />}>
						<div className={"-mt-1"} key={"mail-sidebar-compose"}>
							<ComposeMail publicConfig={publicConfig} identityMailboxes={identityMailboxes} />
						</div>
					</Suspense>
				}
				navUserContent={<Suspense fallback={<Loading />}><NavUserWrapper /></Suspense>}
				sidebarSectionContent={
					<Suspense fallback={<Loading />}>
						<IdentityMailboxesListWrapper />
					</Suspense>
				}
			/>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
