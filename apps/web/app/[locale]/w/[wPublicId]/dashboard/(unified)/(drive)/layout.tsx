import type { DriveState } from "@schema";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type * as React from "react";
import { Suspense } from "react";
import Loading from "@/app/loading";
import DriveSideBar from "@/components/dashboard/drive/drive-side-bar";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { fetchVolumes } from "@/lib/actions/drive";
import { SITE_FEATURES } from "@/lib/site-features";

async function DriveDashboard({ children }: { children: React.ReactNode }) {
	await connection();

	const workspacePublicId = await getWorkspacePublicId();

	if (!SITE_FEATURES.drive) {
		redirect(`/w/${workspacePublicId}/dashboard/mail`);
	}

	const [vols, user] = await Promise.all([fetchVolumes(), isSignedIn()]);

	const initialState: DriveState = {
		localVolumes: [],
		cloudVolumes: vols,
		driveRouteContext: null,
		userId: String(user?.id),
	};

	return (
		<DynamicContextProvider initialState={initialState}>
			<AppSidebar
				workspacePublicId={workspacePublicId}
				sidebarSectionContent={
					<DriveSideBar workspacePublicId={workspacePublicId} />
				}
				navUserContent={
					<Suspense fallback={<Loading />}>
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

export default function DriveLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Suspense fallback={<Loading />}>
			<DriveDashboard>{children}</DriveDashboard>
		</Suspense>
	);
}
