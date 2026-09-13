import { SidebarProvider } from "@/components/ui/sidebar";
import { access } from "@/lib/actions/shared";
import {WorkspaceUnavailable} from "@/components/dashboard/workspace-unavailable";

export default async function DashboardLayout({ children }: {
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
					"--sidebar-width": "250px",
				} as React.CSSProperties
			}
			className="sidebar-animation"
		>
			{children}
		</SidebarProvider>
	);
}
