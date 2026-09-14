import type { LabelScope } from "@schema";
import { Suspense } from "react";
import ContactsNav from "@/components/dashboard/contacts/contacts-sidebar";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import { DashboardSidebarFooterLoading } from "@/components/dashboard/dashboard-loading";
import LabelHome from "@/components/dashboard/labels/label-home";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { fetchContactLabelsWithCounts } from "@/lib/actions/labels";

export default async function ContactsSidebarLayout() {
	const [contactLabels, workspacePublicId] = await Promise.all([
		fetchContactLabelsWithCounts(),
		getWorkspacePublicId(),
	]);

	return (
		<AppSidebar
			workspacePublicId={workspacePublicId}
			sidebarTopContent={
				<div className="-mt-1">
					<NewContactButton
						hideOnMobile
						workspacePublicId={workspacePublicId}
					/>
				</div>
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
						<LabelHome />
					</DynamicContextProvider>
				</>
			}
		/>
	);
}
