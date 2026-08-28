import type * as React from "react";
import { Suspense } from "react";
import {
	DashboardSidebarFooterLoading,
	DashboardSidebarLoading,
	DashboardSidebarSectionLoading,
} from "@/components/dashboard/dashboard-loading";
import NavMainWrapper from "@/components/nav-main-wrapper";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { getWorkspacePublicId } from "@/lib/actions/clients";

async function PlatformSidebar() {
	const workspacePublicId = await getWorkspacePublicId();

	return (
		<AppSidebar
			workspacePublicId={workspacePublicId}
			sidebarSectionContent={
				<Suspense fallback={<DashboardSidebarSectionLoading />}>
					<NavMainWrapper />
				</Suspense>
			}
			navUserContent={
				<Suspense fallback={<DashboardSidebarFooterLoading />}>
					<NavUserWrapper />
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
			<Suspense fallback={<DashboardSidebarLoading />}>
				<PlatformSidebar />
			</Suspense>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
