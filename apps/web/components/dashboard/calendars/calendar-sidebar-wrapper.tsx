import type { CalendarEntity } from "@db";
import { calendars } from "@db";
import { desc, isNotNull } from "drizzle-orm";
import CalendarSideBar from "@/components/dashboard/calendars/calendar-side-bar";
import { fetchDefaultCalendar } from "@/lib/actions/calendar";
import { getWorkspacePublicId, rlsClient } from "@/lib/actions/clients";

async function CalendarSidebarWrapper({
	defaultCalendar: suppliedDefaultCalendar,
	workspacePublicId: suppliedWorkspacePublicId,
}: {
	defaultCalendar?: CalendarEntity;
	workspacePublicId?: string;
} = {}) {
	const rls = await rlsClient();
	const [workspacePublicId, defaultCalendar] = await Promise.all([
		suppliedWorkspacePublicId ?? getWorkspacePublicId(),
		suppliedDefaultCalendar ?? fetchDefaultCalendar(),
	]);

	const userCalendars = await rls((tx) =>
		tx
			.select()
			.from(calendars)
			.where(isNotNull(calendars.identityId))
			.orderBy(desc(calendars.createdAt)),
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
