import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { fetchIdentityMailboxList } from "@/lib/actions/mailbox";
import { DriveState, getPublicEnv } from "@schema";
import { isSignedIn } from "@/lib/actions/auth";
import * as React from "react";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { fetchVolumes } from "@/lib/actions/drive";
import DriveSideBar from "@/components/dashboard/drive/drive-side-bar";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const publicConfig = getPublicEnv();
	const [identityMailboxes, user] = await Promise.all([
		fetchIdentityMailboxList(),
		isSignedIn()
	]);

    const volumes = await fetchVolumes()
    const initialState: DriveState = {
        volumes
    };

	return (
		<>
			<DynamicContextProvider
				initialState={initialState}
			>
				<AppSidebar
					publicConfig={publicConfig}
					user={user}
					identityMailboxes={identityMailboxes}
					sidebarSectionContent={
						<DriveSideBar />
					}
					sidebarTopContent={
						<>
							<div className={"-mt-1"}>
								<NewUploadButton hideOnMobile={true} />
							</div>
						</>
					}
				/>
				<SidebarInset>{children}</SidebarInset>
			</DynamicContextProvider>
		</>
	);
}
