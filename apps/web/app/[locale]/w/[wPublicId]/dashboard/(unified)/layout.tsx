import { DASHBOARD_SIDEBAR_WIDTHS } from "@/components/dashboard/dashboard-loading";
import { WorkspaceUnavailable } from "@/components/dashboard/workspace-unavailable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { access } from "@/lib/actions/shared";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { canUseWorkspace, reason } = await access("canUseWorkspace");

	if (!canUseWorkspace) {
		return <WorkspaceUnavailable reason={reason} />;
	}

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": DASHBOARD_SIDEBAR_WIDTHS.default,
				} as React.CSSProperties
			}
		>
			{children}
		</SidebarProvider>
	);
}
