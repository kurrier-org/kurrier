import { AppSidebar } from "@/components/ui/dashboards/workspace/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getPublicEnv } from "@schema";
import { getGravatarUrl, isSignedIn } from "@/lib/actions/auth";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const publicCofig = getPublicEnv();
	const user = await isSignedIn();
	const avatar = await getGravatarUrl(String(user?.email));
	return (
		<SidebarProvider>
			<AppSidebar publicConfig={publicCofig} user={user} avatar={avatar} />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
