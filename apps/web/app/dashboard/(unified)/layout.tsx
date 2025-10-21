import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {
	fetchIdentityMailboxList,
	fetchMailboxUnreadCounts,
} from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";
import { getGravatarUrl, isSignedIn } from "@/lib/actions/auth";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const identityMailboxes = await fetchIdentityMailboxList();
	const unreadCounts = await fetchMailboxUnreadCounts();

	const publicConfig = getPublicEnv();
	const user = await isSignedIn();
	const avatar = await getGravatarUrl(String(user?.email));

	return (
		<>
			<SidebarProvider
				style={
					{
						"--sidebar-width": "250px",
					} as React.CSSProperties
				}
			>
				<AppSidebar
					publicConfig={publicConfig}
					user={user}
					avatar={avatar}
					identityMailboxes={identityMailboxes}
					unreadCounts={unreadCounts}
				/>
				<SidebarInset>{children}</SidebarInset>
			</SidebarProvider>
		</>
	);
}
