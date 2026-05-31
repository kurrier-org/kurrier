import { rlsClient, getWorkspacePublicId } from "@/lib/actions/clients";
import { calendars } from "@db";
import {desc, isNotNull} from "drizzle-orm";
import CalendarSideBar from "@/components/dashboard/calendars/calendar-side-bar";
import {fetchDefaultCalendar} from "@/lib/actions/calendar";

async function CalendarSidebarWrapper() {
    const rls = await rlsClient();
    const workspacePublicId = await getWorkspacePublicId();
    const defaultCalendar = await fetchDefaultCalendar();

    const userCalendars = await rls((tx) =>
        tx
            .select()
            .from(calendars)
            .where(isNotNull(calendars.identityId))
            .orderBy(desc(calendars.createdAt))
    );

    return (
        <CalendarSideBar
            workspacePublicId={workspacePublicId}
            defaultCalendar={defaultCalendar}
            userCalendarsPromise={Promise.resolve(userCalendars)}
        />
    );
}
export default CalendarSidebarWrapper;
