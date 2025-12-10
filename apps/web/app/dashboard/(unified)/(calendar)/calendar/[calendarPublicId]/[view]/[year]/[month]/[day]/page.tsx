import React from "react";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import {
	eventsByDayWithAllDay,
	fetchDefaultCalendar,
	fetchEventAttendees,
	getContactsForAttendeeIds,
	getRangeForCalendarView,
	fetchCalendarEventsForRange,
	expandEventsForRange,
} from "@/lib/actions/calendar";
import type { CalendarViewType } from "@schema";

async function Page({
	params,
}: {
	params: {
		calendarPublicId: string;
		view: string;
		year: string;
		month: string;
		day: string;
	};
}) {
	const resolvedParams = await params;
	const defaultCalendar = await fetchDefaultCalendar();

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
	const contacts = await getContactsForAttendeeIds(attendeeIds);

	return (
		<WeekGrid
			events={expandedEvents}
			byDayMap={timedByDay}
			attendees={attendees}
			attendeeContacts={contacts}
			allDayByDay={allDayByDay}
		/>
	);
}

export default Page;
