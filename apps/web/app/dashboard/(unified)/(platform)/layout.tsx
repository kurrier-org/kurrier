import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {
	fetchIdentityMailboxList,
} from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";
import { getGravatarUrl, isSignedIn } from "@/lib/actions/auth";
import { NavMain } from "@/components/nav-main";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
    const publicConfig = getPublicEnv();
    const [identityMailboxes, user] = await Promise.all([
        fetchIdentityMailboxList(),
        isSignedIn(),
    ]);
    const avatar = await getGravatarUrl(String(user?.email));

	return (
		<>
            <AppSidebar
                publicConfig={publicConfig}
                user={user}
                avatar={avatar}
                identityMailboxes={identityMailboxes}
                sidebarSectionContent={<NavMain />}
            />
            <SidebarInset>{children}</SidebarInset>
		</>
	);
}
