import React from "react";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import {
    eventsByDayWithAllDay,
    fetchCalendarEventsForView,
    fetchDefaultCalendar, fetchEventAttendees, getContactsForAttendeeIds,
} from "@/lib/actions/calendar";

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
	const [resolvedParams, defaultCalendar] = await Promise.all([
		params,
		fetchDefaultCalendar(),
	]);
	const events = await fetchCalendarEventsForView(
		defaultCalendar.id,
		defaultCalendar.timezone,
		"week",
		{
			year: resolvedParams.year ? Number(resolvedParams.year) : undefined,
			month: resolvedParams.month ? Number(resolvedParams.month) : undefined,
			day: resolvedParams.day ? Number(resolvedParams.day) : undefined,
		},
	);
    const { timedByDay, allDayByDay } = await eventsByDayWithAllDay(defaultCalendar.timezone, events);
    const attendees = await fetchEventAttendees(events.map(e => e.id));
    const attendeeIds = Object.values(attendees).flatMap(list => list.map(a => a.id));
    const contacts = await getContactsForAttendeeIds(attendeeIds);

	return <WeekGrid events={events} byDayMap={timedByDay} attendees={attendees} attendeeContacts={contacts} allDayByDay={allDayByDay} />;
}

export default Page;
