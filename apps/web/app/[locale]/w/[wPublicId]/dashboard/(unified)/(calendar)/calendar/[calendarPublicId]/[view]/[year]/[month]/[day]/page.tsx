import type { CalendarViewType } from "@schema";
import { connection } from "next/server";
import { Suspense } from "react";
import DayGrid from "@/components/dashboard/calendars/day-view";
import DefaultCalendarContext from "@/components/dashboard/calendars/default-calendar-context";
import MonthGrid from "@/components/dashboard/calendars/month-view";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import { DashboardContentLoading } from "@/components/dashboard/dashboard-loading";
import {
	eventsByDayWithAllDay,
	expandEventsForRange,
	fetchCalendarEventsForRange,
	fetchDefaultCalendar,
	fetchEventAttendees,
	getContactsForAttendeeIds,
	getRangeForCalendarView,
} from "@/lib/actions/calendar";
import { getWorkspacePublicId } from "@/lib/actions/clients";

type PageParams = Promise<{
	calendarPublicId: string;
	view: string;
	year: string;
	month: string;
	day: string;
}>;

async function CalendarContent({ params }: { params: PageParams }) {
	await connection();

	const resolvedParams = await params;

	const defaultCalendar = await fetchDefaultCalendar(
		resolvedParams.calendarPublicId,
	);

	const view: CalendarViewType =
		(resolvedParams.view as CalendarViewType) || "week";

	const viewParams = {
		year: resolvedParams.year ? Number(resolvedParams.year) : undefined,
		month: resolvedParams.month ? Number(resolvedParams.month) : undefined,
		day: resolvedParams.day ? Number(resolvedParams.day) : undefined,
	};

	const { from, to } = await getRangeForCalendarView(
		defaultCalendar.timezone,
		view,
		viewParams,
	);

	const fromDate = from instanceof Date ? from : from.toDate();
	const toDate = to instanceof Date ? to : to.toDate();

	const events = await fetchCalendarEventsForRange(
		defaultCalendar.id,
		fromDate,
		toDate,
	);

	const expandedEvents = await expandEventsForRange(
		events,
		fromDate,
		toDate,
		defaultCalendar.timezone,
	);

	const { timedByDay, allDayByDay } = await eventsByDayWithAllDay(
		defaultCalendar.timezone,
		expandedEvents,
	);

	const masterIds = Array.from(new Set(expandedEvents.map((e) => e.id)));

	const attendees = await fetchEventAttendees(masterIds);

	const attendeeIds = Object.values(attendees).flatMap((list) =>
		list.map((a) => a.id),
	);

	const contacts = getContactsForAttendeeIds(attendeeIds);

	const workspacePublicId = await getWorkspacePublicId();

	return (
		<DefaultCalendarContext defaultCalendar={defaultCalendar}>
			{view === "week" ? (
				<WeekGrid
					events={expandedEvents}
					byDayMap={timedByDay}
					attendees={attendees}
					attendeeContacts={contacts}
					allDayByDay={allDayByDay}
				/>
			) : view === "month" ? (
				<MonthGrid
					events={expandedEvents}
					byDayMap={timedByDay}
					attendees={attendees}
					attendeeContacts={contacts}
					allDayByDay={allDayByDay}
					workspacePublicId={workspacePublicId}
				/>
			) : (
				<DayGrid
					events={expandedEvents}
					byDayMap={timedByDay}
					attendees={attendees}
					attendeeContacts={contacts}
					allDayByDay={allDayByDay}
				/>
			)}
		</DefaultCalendarContext>
	);
}

function Page({ params }: { params: PageParams }) {
	return (
		<Suspense fallback={<DashboardContentLoading />}>
			<CalendarContent params={params} />
		</Suspense>
	);
}

export default Page;
