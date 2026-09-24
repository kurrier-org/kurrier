import { Suspense } from "react";
import { connection } from "next/server";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceUnavailable } from "@/components/dashboard/workspace-unavailable";
import WorkspaceThemeSync from "@/components/providers/workspace-theme-sync";
import { fetchWorkspace } from "@/lib/actions/workspace";
import { access } from "@/lib/actions/shared";
import { ThemeNameSchema } from "@schema/types/themes";
import Loading from "@/app/loading";

async function WorkspaceDashboard({
                                      children,
                                  }: {
    children: React.ReactNode;
}) {
    await connection();

    const { canUseWorkspace, reason } = await access("canUseWorkspace");

    if (!canUseWorkspace) {
        return <WorkspaceUnavailable reason={reason} />;
    }

    const workspace = await fetchWorkspace();
    const theme = ThemeNameSchema.catch("indigo").parse(workspace?.theme);

    return (
        <SidebarProvider
            style={{ "--sidebar-width": "250px" } as React.CSSProperties}
            className="sidebar-animation"
        >
            <WorkspaceThemeSync theme={theme} />
            {children}
        </SidebarProvider>
    );
}

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<Loading />}>
            <WorkspaceDashboard>{children}</WorkspaceDashboard>
        </Suspense>
    );
}
