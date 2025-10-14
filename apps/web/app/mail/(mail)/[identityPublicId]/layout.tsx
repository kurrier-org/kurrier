import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/mailbox/default/app-sidebar";
import { fetchMailbox } from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";
import { getGravatarUrl, isSignedIn } from "@/lib/actions/auth";

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: any;
}) {
	const { identityPublicId, mailboxSlug = "inbox" } = await params;
	const { activeMailbox, mailboxList, identity } = await fetchMailbox(
		identityPublicId,
		mailboxSlug,
	);
	const publicConfig = getPublicEnv();
	const user = await isSignedIn();
	const avatar = await getGravatarUrl(String(user?.email));

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "225px",
				} as React.CSSProperties
			}
		>
			<AppSidebar
				activeMailbox={activeMailbox}
				mailboxList={mailboxList}
				identity={identity}
				publicConfig={publicConfig}
				user={user}
				avatar={avatar}
			/>
			<SidebarInset>{children}</SidebarInset>
		</SidebarProvider>
	);
}
