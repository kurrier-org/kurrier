import {SidebarProvider} from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: {
    children: React.ReactNode;
}) {

    return <>
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "250px",
                } as React.CSSProperties
            }
            className={"sidebar-animation"}
        >
            {children}
        </SidebarProvider>
    </>
}
