import React from "react";
import { WeekGrid } from "@/components/dashboard/calendars/week-view";
import {
	eventsByDay,
	eventsBySlot,
	fetchCalendarEventsForView,
	fetchDefaultCalendar,
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
	const slotMap = await eventsBySlot(defaultCalendar.timezone, events);
	const byDayMap = await eventsByDay(defaultCalendar.timezone, events);

	return <WeekGrid events={events} byDayMap={byDayMap} />;
}

export default Page;
