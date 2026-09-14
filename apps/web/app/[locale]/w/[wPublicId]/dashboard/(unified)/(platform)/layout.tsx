import type * as React from "react";
import { Suspense } from "react";
import {
	DashboardSidebarFooterLoading,
	DashboardSidebarSectionLoading,
} from "@/components/dashboard/dashboard-loading";
import NavMainWrapper from "@/components/nav-main-wrapper";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<AppSidebar
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
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
