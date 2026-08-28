import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { DriveState } from "@schema";
import { isSignedIn } from "@/lib/actions/auth";
import * as React from "react";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { fetchVolumes } from "@/lib/actions/drive";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import { Suspense } from "react";
import { connection } from "next/server";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { redirect } from "next/navigation";
import { SITE_FEATURES } from "@/lib/site-features";

async function DriveDashboard({
                                  children,
                              }: {
    children: React.ReactNode;
}) {
    await connection();

    const workspacePublicId = await getWorkspacePublicId();

    if (!SITE_FEATURES.drive) {
        redirect(`/w/${workspacePublicId}/dashboard/mail`);
    }

    const [vols, user] = await Promise.all([
        fetchVolumes(),
        isSignedIn(),
    ]);

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
                sidebarSectionContent={null}
                navUserContent={
                    <Suspense fallback={<Loading />}>
                        <NavUserWrapper />
                    </Suspense>
                }
                sidebarTopContent={
                    <div className="-mt-1">
                        <NewUploadButton hideOnMobile />
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
