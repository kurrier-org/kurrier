import React from "react";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import {
    eventsByDay,
    fetchCalendarEventsForView,
    fetchDefaultCalendar, fetchEventAttendees, getContactsForAttendeeIds,
} from "@/lib/actions/calendar";

async function Page() {
	const defaultCalendar = await fetchDefaultCalendar();
	const events = await fetchCalendarEventsForView(
		defaultCalendar.id,
		defaultCalendar.timezone,
		"week",
		{
			year: undefined,
			month: undefined,
			day: undefined,
		},
	);
	const byDayMap = await eventsByDay(defaultCalendar.timezone, events);
    const attendees = await fetchEventAttendees(events.map(e => e.id));
    const attendeeIds = Object.values(attendees).flatMap(list => list.map(a => a.id));
    const contacts = await getContactsForAttendeeIds(attendeeIds);

	return <WeekGrid events={events} attendees={attendees} byDayMap={byDayMap} attendeeContacts={contacts} />;
}

export default Page;
