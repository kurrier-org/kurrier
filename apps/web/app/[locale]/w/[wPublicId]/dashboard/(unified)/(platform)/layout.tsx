import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {Suspense} from "react";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import * as React from "react";
import NavMainWrapper from "@/components/nav-main-wrapper";
import WorkspaceLogo from "@/components/common/workspace-logo";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const workspacePublicId = await getWorkspacePublicId()

	return (
		<>
			<AppSidebar
				sidebarTopContent={
					<Suspense fallback={<div className="h-9" />} key={workspacePublicId}>
						<WorkspaceLogo />
					</Suspense>
				}
				workspacePublicId={workspacePublicId}
				sidebarSectionContent={
					<Suspense fallback={<Loading />} key={workspacePublicId}>
						<NavMainWrapper />
					</Suspense>}
				navUserContent={<Suspense key={workspacePublicId} fallback={<Loading />}><NavUserWrapper /></Suspense>}
			/>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
