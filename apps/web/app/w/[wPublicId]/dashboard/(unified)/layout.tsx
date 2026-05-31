import { SidebarProvider } from "@/components/ui/sidebar";
import {fetchWorkspace} from "@/lib/actions/workspace";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const workspace = await fetchWorkspace();
	return (
		<>
		{workspace?.isStorageOverLimit && <div className={" bg-red-100 w-full mb-4 rounded text-center z-10 text-sm text-red-700 p-2"}>
				Your account is on hold. Please upgrade your workspace storage limit.
			</div>}

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
	);
}
