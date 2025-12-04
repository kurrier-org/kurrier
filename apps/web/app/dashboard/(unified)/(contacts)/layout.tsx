import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { fetchIdentityMailboxList } from "@/lib/actions/mailbox";
import { fetchContactLabelsWithCounts } from "@/lib/actions/labels";
import { getPublicEnv, LabelScope } from "@schema";
import { isSignedIn } from "@/lib/actions/auth";
import ContactsNav from "@/components/dashboard/contacts/contacts-sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import LabelHome from "@/components/dashboard/labels/label-home";
import * as React from "react";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const publicConfig = getPublicEnv();
	const [identityMailboxes, user, contactLabels] = await Promise.all([
		fetchIdentityMailboxList(),
		isSignedIn(),
		fetchContactLabelsWithCounts(),
	]);

	return (
		<>
			<AppSidebar
				publicConfig={publicConfig}
				user={user}
				identityMailboxes={identityMailboxes}
				sidebarTopContent={
					<>
						<div className={"-mt-1"}>
							<NewContactButton hideOnMobile={true} />
						</div>
					</>
				}
				sidebarSectionContent={
					<>
						<ContactsNav />
						<DynamicContextProvider
							initialState={{
								labels: contactLabels,
								scope: "contact" as LabelScope,
							}}
						>
							<LabelHome />
						</DynamicContextProvider>
					</>
				}
			/>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
