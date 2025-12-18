import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {
    fetchIdentityMailboxList, fetchIdentitySnoozedThreads,
    fetchMailboxUnreadCounts, fetchScheduledDraftCounts,
} from "@/lib/actions/mailbox";
import {fetchLabelsWithCounts} from "@/lib/actions/labels";
import { getPublicEnv, LabelScope } from "@schema";
import { isSignedIn } from "@/lib/actions/auth";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import LabelHome from "@/components/dashboard/labels/label-home";
import * as React from "react";
import IdentityMailboxesList from "@/components/dashboard/identity-mailboxes-list";
import ComposeMail from "@/components/mailbox/default/compose-mail";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const publicConfig = getPublicEnv();
	const [identityMailboxes, unreadCounts, user, globalLabels, scheduledDrafts] =
		await Promise.all([
			fetchIdentityMailboxList(),
			fetchMailboxUnreadCounts(),
			isSignedIn(),
			fetchLabelsWithCounts(),
            fetchScheduledDraftCounts(),
		]);
    const {threads: snoozedThreads} = await fetchIdentitySnoozedThreads(identityMailboxes[0]?.identity?.publicId)


	return (
		<>
			<AppSidebar
				publicConfig={publicConfig}
				user={user}
				identityMailboxes={identityMailboxes}
				sidebarTopContent={
					<div className={"-mt-1"} key={"mail-sidebar-compose"}>
						{identityMailboxes.length > 0 && (
							<ComposeMail publicConfig={publicConfig} />
						)}
					</div>
				}
				sidebarSectionContent={
					<>
						<IdentityMailboxesList
							identityMailboxes={identityMailboxes}
							unreadCounts={unreadCounts}
                            scheduledDrafts={scheduledDrafts}
                            snoozedThreads={snoozedThreads}
						/>
						<DynamicContextProvider
							initialState={{
								labels: globalLabels,
								scope: "thread" as LabelScope,
							}}
						>
							{identityMailboxes.length > 0 && <LabelHome />}
						</DynamicContextProvider>
					</>
				}
			/>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
