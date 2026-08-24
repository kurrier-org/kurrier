import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { DriveState } from "@schema";
import { isSignedIn } from "@/lib/actions/auth";
import * as React from "react";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { fetchVolumes } from "@/lib/actions/drive";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import {Suspense} from "react";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import { redirect } from "next/navigation";
import { SITE_FEATURES } from "@/lib/site-features";

export default async function DriveLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    const workspacePublicId = await getWorkspacePublicId();
    if (!SITE_FEATURES.drive) {
        redirect(`/w/${workspacePublicId}/dashboard/mail`);
    }

    const vols = await fetchVolumes();
    const userId = await isSignedIn();
    const initialState: DriveState = {
        localVolumes: [],
        cloudVolumes: vols,
        driveRouteContext: null,
        userId: String(userId?.id),
    };
    return (
        <>
            <DynamicContextProvider initialState={initialState}>
                <AppSidebar
                    workspacePublicId={workspacePublicId}
                    sidebarSectionContent={
                        <Suspense fallback={<Loading />}>

                        </Suspense>
                    }
                    navUserContent={
                        <Suspense fallback={<Loading />}>
                            <NavUserWrapper />
                        </Suspense>
                    }
                    sidebarTopContent={
                        <Suspense fallback={<Loading />}>
                            <div className={"-mt-1"}>
                                <NewUploadButton hideOnMobile={true} />
                            </div>
                        </Suspense>
                    }
                />
                <SidebarInset>{children}</SidebarInset>
            </DynamicContextProvider>
        </>
    );
}
