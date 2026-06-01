import React from "react";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import {
	eventsByDayWithAllDay,
	expandEventsForRange,
	fetchCalendarEventsForRange,
	fetchDefaultCalendar,
	fetchEventAttendees,
	getContactsForAttendeeIds,
	getRangeForCalendarView,
} from "@/lib/actions/calendar";
import { CalendarViewType } from "@schema";
import DefaultCalendarContext from "@/components/dashboard/calendars/default-calendar-context";

async function Page() {
	const defaultCalendar = await fetchDefaultCalendar();
	const view: CalendarViewType = "week";

	const viewParams = { year: undefined, month: undefined, day: undefined };

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

	return (
		<DefaultCalendarContext defaultCalendar={defaultCalendar}>
			<WeekGrid
				events={expandedEvents}
				byDayMap={timedByDay}
				attendees={attendees}
				attendeeContacts={contacts}
				allDayByDay={allDayByDay}
			/>
		</DefaultCalendarContext>
	);
}

export default Page;
