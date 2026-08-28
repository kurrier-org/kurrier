import { DISTRIBUTION_CONFIG } from "@distribution/config";
import type { DriveState } from "@schema";
import { redirect } from "next/navigation";
import type * as React from "react";
import { cache, Suspense } from "react";
import {
	DashboardSidebarFooterLoading,
	DashboardSidebarSectionLoading,
} from "@/components/dashboard/dashboard-loading";
import DriveSideBar from "@/components/dashboard/drive/drive-side-bar";
import DriveStateSync from "@/components/dashboard/drive/drive-state-sync";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { fetchVolumes } from "@/lib/actions/drive";

const EMPTY_DRIVE_STATE: DriveState = {
	localVolumes: [],
	cloudVolumes: [],
	driveRouteContext: null,
	userId: "",
};

const loadDriveDashboardData = cache(async () => {
	const workspacePublicId = await getWorkspacePublicId();

	if (!DISTRIBUTION_CONFIG.features.drive) {
		redirect(`/w/${workspacePublicId}/dashboard/mail`);
	}

	const [volumes, user] = await Promise.all([fetchVolumes(), isSignedIn()]);
	const initialState: DriveState = {
		localVolumes: [],
		cloudVolumes: volumes,
		driveRouteContext: null,
		userId: String(user?.id),
	};

	return { initialState, workspacePublicId };
});

async function DriveSidebarSection() {
	const { initialState, workspacePublicId } = await loadDriveDashboardData();

	return (
		<>
			<DriveStateSync state={initialState} />
			<DynamicContextProvider initialState={initialState}>
				<DriveSideBar workspacePublicId={workspacePublicId} />
			</DynamicContextProvider>
		</>
	);
}

export default function DriveLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<DynamicContextProvider initialState={EMPTY_DRIVE_STATE}>
			<AppSidebar
				sidebarSectionContent={
					<Suspense fallback={<DashboardSidebarSectionLoading />}>
						<DriveSidebarSection />
					</Suspense>
				}
				navUserContent={
					<Suspense fallback={<DashboardSidebarFooterLoading />}>
						<NavUserWrapper />
					</Suspense>
				}
				sidebarTopContent={
					<div className="-mt-1">
						<NewUploadButton className="hidden md:inline-flex" />
					</div>
				}
			/>

			<SidebarInset>{children}</SidebarInset>
		</DynamicContextProvider>
	);
}
