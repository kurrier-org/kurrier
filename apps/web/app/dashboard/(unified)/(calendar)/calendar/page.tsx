import React from "react";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import {
	eventsByDay,
	eventsBySlot,
	fetchCalendarEventsForView,
	fetchDefaultCalendar,
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
	const slotMap = await eventsBySlot(defaultCalendar.timezone, events);
	const byDayMap = await eventsByDay(defaultCalendar.timezone, events);

	return <WeekGrid events={events} byDayMap={byDayMap} />;
}

export default Page;
