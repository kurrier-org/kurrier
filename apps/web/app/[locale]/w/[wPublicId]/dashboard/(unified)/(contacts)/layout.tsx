import type { LabelScope } from "@schema";
import type * as React from "react";
import { Suspense } from "react";
import ContactsNav from "@/components/dashboard/contacts/contacts-sidebar";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import {
	DashboardSidebarActionLoading,
	DashboardSidebarFooterLoading,
	DashboardSidebarLoading,
} from "@/components/dashboard/dashboard-loading";
import RenderContactsLabelHomeSidebar from "@/components/dashboard/labels/render-contacts-label-home-sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { fetchContactLabelsWithCounts } from "@/lib/actions/labels";

async function ContactsSidebar() {
	const [contactLabels, workspacePublicId] = await Promise.all([
		fetchContactLabelsWithCounts(),
		getWorkspacePublicId(),
	]);

	return (
		<AppSidebar
			workspacePublicId={workspacePublicId}
			sidebarTopContent={
				<Suspense fallback={<DashboardSidebarActionLoading />}>
					<div className="-mt-1">
						<NewContactButton
							hideOnMobile
							workspacePublicId={workspacePublicId}
						/>
					</div>
				</Suspense>
			}
			navUserContent={
				<Suspense fallback={<DashboardSidebarFooterLoading />}>
					<NavUserWrapper />
				</Suspense>
			}
			sidebarSectionContent={
				<>
					<ContactsNav workspacePublicId={workspacePublicId} />

					<DynamicContextProvider
						initialState={{
							labels: contactLabels,
							scope: "contact" as LabelScope,
							workspacePublicId,
						}}
					>
						<RenderContactsLabelHomeSidebar globalLabels={contactLabels} />
					</DynamicContextProvider>
				</>
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
				<ContactsSidebar />
			</Suspense>

			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
