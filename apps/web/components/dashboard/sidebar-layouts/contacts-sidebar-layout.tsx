import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { fetchContactLabelsWithCounts } from "@/lib/actions/labels";
import { LabelScope } from "@schema";
import ContactsNav from "@/components/dashboard/contacts/contacts-sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import LabelHome from "@/components/dashboard/labels/label-home";
import * as React from "react";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {Suspense} from "react";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";

export default async function ContactsSidebarLayout() {
    const [contactLabels, workspacePublicId] = await Promise.all([
        fetchContactLabelsWithCounts(),
        getWorkspacePublicId()
    ]);

    return (
        <>
            <AppSidebar
                workspacePublicId={workspacePublicId}
                sidebarTopContent={
                    <>
                        <div className={"-mt-1"}>
                            <NewContactButton hideOnMobile={true} workspacePublicId={workspacePublicId} />
                        </div>
                    </>
                }
                navUserContent={<Suspense fallback={<Loading />}><NavUserWrapper /></Suspense>}
                sidebarSectionContent={
                    <>
                        <ContactsNav workspacePublicId={workspacePublicId} />
                        <DynamicContextProvider
                            initialState={{
                                labels: contactLabels,
                                scope: "contact" as LabelScope,
                                workspacePublicId
                            }}
                        >
                            <LabelHome />
                        </DynamicContextProvider>
                    </>
                }
            />
        </>
    );
}
