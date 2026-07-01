import React, { ReactNode } from "react";
import {Blocks} from "lucide-react";
import { Container } from "@/components/common/containers";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {SidebarTrigger} from "@/components/ui/sidebar";
import {Separator} from "@/components/ui/separator";
import WorkspacesTabs from "@/components/dashboard/workspaces/workspaces-tabs";

type LayoutProps = {
	children: ReactNode;
};



export default async function Layout({
	children,
}: LayoutProps) {

    const workspacePublicId = await getWorkspacePublicId()


    return <>
        {/*<MailboxSearchHeader params={params} />*/}
        <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                />
            </div>
        </header>

        <Container variant="medium">

            <div className={"mx-12"}>
                <div className="flex items-center justify-between my-4">
                    <h1 className="text-xl font-bold text-foreground">Workspace</h1>
                </div>

                <p className="max-w-prose text-sm text-muted-foreground my-6 mb-12">
                    Manage your workspace identities and settings here. Each workspace can have its own identity and configuration.
                </p>
            </div>

            <div className={"grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] mx-12"}>
                <div className={"rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"}>
                    <div className={"px-3 pb-3 pt-2"}>
                        <div className={"flex items-center gap-3"}>
                            <div className={"flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand/50 text-brand dark:text-brand-foreground"}>
                                <Blocks size={18} />
                            </div>
                            <div className={"min-w-0"}>
                                <div className={"truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50"}>
                                    Workspaces
                                </div>
                                <div className={"truncate text-xs text-neutral-600 dark:text-neutral-400"}>
                                    Settings
                                </div>
                            </div>
                        </div>
                    </div>

                    <WorkspacesTabs workspacePublicId={workspacePublicId} />
                </div>


                <div className={"space-y-6"}>
                    {children}
                </div>

            </div>
        </Container>

    </>
}
