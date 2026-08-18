import { SidebarProvider } from "@/components/ui/sidebar";
import {fetchWorkspace} from "@/lib/actions/workspace";
import { getDictionary } from "@/lib/dictionaries";

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const [workspace, dict] = await Promise.all([
		fetchWorkspace(),
		getDictionary(locale),
	]);
	return (
		<>
		{workspace?.isStorageOverLimit && <div className={" bg-red-100 w-full mb-4 rounded text-center z-10 text-sm text-red-700 p-2"}>
				{dict.dashboard.storageOverLimit}
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
