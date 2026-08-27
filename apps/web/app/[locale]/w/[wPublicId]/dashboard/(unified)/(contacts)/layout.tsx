import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { fetchContactLabelsWithCounts } from "@/lib/actions/labels";
import { LabelScope } from "@schema";
import ContactsNav from "@/components/dashboard/contacts/contacts-sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import * as React from "react";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { Suspense } from "react";
import { connection } from "next/server";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import RenderContactsLabelHomeSidebar from "@/components/dashboard/labels/render-contacts-label-home-sidebar";

async function ContactsSidebar() {
	await connection();

	const [contactLabels, workspacePublicId] = await Promise.all([
		fetchContactLabelsWithCounts(),
		getWorkspacePublicId(),
	]);

	return (
		<AppSidebar
			workspacePublicId={workspacePublicId}
			sidebarTopContent={
				<Suspense fallback={<Loading />}>
					<div className="-mt-1">
						<NewContactButton
							hideOnMobile
							workspacePublicId={workspacePublicId}
						/>
					</div>
				</Suspense>
			}
			navUserContent={
				<Suspense fallback={<Loading />}>
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
						<RenderContactsLabelHomeSidebar
							globalLabels={contactLabels}
						/>
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
			<Suspense fallback={<Loading />}>
				<ContactsSidebar />
			</Suspense>

			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
