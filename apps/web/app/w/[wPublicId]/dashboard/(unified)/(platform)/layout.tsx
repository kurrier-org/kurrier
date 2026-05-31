import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {Suspense} from "react";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import * as React from "react";
import NavMainWrapper from "@/components/nav-main-wrapper";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const workspacePublicId = await getWorkspacePublicId()


	return (
		<>
			<AppSidebar
				workspacePublicId={workspacePublicId}
				sidebarSectionContent={
					<Suspense fallback={<Loading />}>
						<NavMainWrapper />
					</Suspense>}
				navUserContent={<Suspense fallback={<Loading />}><NavUserWrapper /></Suspense>}
			/>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
