import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {
	fetchIdentityMailboxList,
} from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";
import { getGravatarUrl, isSignedIn } from "@/lib/actions/auth";
import CalendarSideBar from "@/components/dashboard/calendars/calendar-side-bar";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import * as React from "react";
import NewEventButton from "@/components/dashboard/calendars/new-event-button";
import {fetchDefaultCalendar} from "@/lib/actions/calendar";

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
    const defaultCalendar = await fetchDefaultCalendar();

	return (
		<>
            <AppSidebar
                publicConfig={publicConfig}
                user={user}
                avatar={avatar}
                identityMailboxes={identityMailboxes}
                sidebarSectionContent={<CalendarSideBar defaultCalendar={defaultCalendar} />}
                sidebarTopContent={<>
                    <div className={"-mt-1"}>
                        <NewEventButton hideOnMobile={true} />
                    </div>
                </>}
            />
            <SidebarInset>{children}</SidebarInset>
		</>
	);
}
