"use client";
import React, { useEffect } from "react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import {
	AllDayFragment,
	CalendarState,
	ComposeContact,
	EventSlotFragment,
	EventSlotRenderFragment,
} from "@schema";
import { useParams } from "next/navigation";
import CalendarDayHourBox from "@/components/dashboard/calendars/calendar-day-hour-box";
import { CalendarEventAttendeeEntity, CalendarEventEntity } from "@db";
import {
	layoutDayFragments,
	splitFragmentIntoHours,
} from "@/components/dashboard/calendars/client-helpers";
import CalendarEventsLayer from "@/components/dashboard/calendars/calendar-events-layer";
import { getDayjsTz } from "@common/day-js-extended";
import AllDayEventsRow from "@/components/dashboard/calendars/all-day-events-row";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHourLabel(hour: number) {
	if (hour === 0) return "12 AM";
	if (hour < 12) return `${hour} AM`;
	if (hour === 12) return "12 PM";
	return `${hour - 12} PM`;
}

export function WeekGrid({
	events,
	attendees,
	byDayMap,
	attendeeContacts,
	allDayByDay,
}: {
	events: CalendarEventEntity[];
	attendees: Record<string, CalendarEventAttendeeEntity[]>;
	byDayMap: Map<string, EventSlotFragment[]>;
	attendeeContacts: Promise<ComposeContact[]>;
	allDayByDay: Map<string, AllDayFragment[]>;
}) {
	const { setState, state } = useDynamicContext<CalendarState>();
	const params = useParams();
	const dayjsTz = getDayjsTz(state.defaultCalendar.timezone);
	const contacts = React.use(attendeeContacts);

	useEffect(() => {
		setState((prev) => ({
			...prev,
			calendarEvents: events,
			calendarEventAttendees: attendees,
			attendeeContacts: contacts,
		}));
	}, [events, setState, attendees]);

	const baseDay =
		params.year && params.month && params.day
			? dayjsTz()
					.year(Number(params.year))
					.month(Number(params.month) - 1)
					.date(Number(params.day))
			: dayjsTz();

	const startOfWeek = baseDay.startOf("week");

	const weekDays = Array.from({ length: 7 }, (_, i) => {
		const d = startOfWeek.add(i, "day");
		return {
			label: d.format("ddd").toUpperCase(),
			date: d.date(),
			isSameDay: d.isSame(dayjsTz(), "day"),
			day: d,
		};
	});

	const renderSlotMap = new Map<string, EventSlotRenderFragment[]>();
	const dayRenderMap = new Map<string, EventSlotRenderFragment[]>();

	for (const day of weekDays) {
		const dayKey = day.day.format("YYYY-MM-DD");
		const dayFrags = byDayMap.get(dayKey) ?? [];

		const laidOut = layoutDayFragments(dayFrags);
		dayRenderMap.set(dayKey, laidOut);

		for (const frag of laidOut) {
			const hourPieces = splitFragmentIntoHours(frag);
			for (const piece of hourPieces) {
				const hourKey = `${dayKey}:${piece.hour}`;
				const bucket = renderSlotMap.get(hourKey);
				if (bucket) bucket.push(piece);
				else renderSlotMap.set(hourKey, [piece]);
			}
		}
	}

	return (
		<div className="w-full h-full">
			<div className="overflow-hidden text-xs text-neutral-700">
				<div className="grid grid-cols-[64px_repeat(7,1fr)] border-b dark:border-neutral-700 border-neutral-200 bg-neutral-50 dark:bg-neutral-800 w-full">
					<div
						className="flex items-center justify-start px-3 py-2 text-xxs text-neutral-500 dark:text-brand-foreground cursor-default"
						title={state.calendarTzName}
					>
						{state.calendarTzAbbr}
					</div>
					{weekDays.map((d) => (
						<div
							key={`${d.label}-${d.date}`}
							className={`flex flex-col items-center justify-center py-2 gap-3 ${
								d.isSameDay ? "bg-brand-100 dark:bg-brand-700" : ""
							}`}
						>
							<span
								className={`text-xxs tracking-wide ${
									d.isSameDay
										? "text-brand dark:text-brand-foreground"
										: "text-neutral-500 dark:text-brand-foreground"
								}`}
							>
								{d.label}
							</span>
							<span
								className={`animate-in fade-in duration-300 text-2xl font-medium ${
									d.isSameDay
										? "text-brand dark:text-brand-foreground"
										: "text-neutral-900 dark:text-brand-foreground"
								}`}
							>
								{d.date}
							</span>
						</div>
					))}
				</div>

				<AllDayEventsRow weekDays={weekDays} allDayByDay={allDayByDay} />

				<div className="flex flex-1 flex-col h-[calc(100vh-8rem)] overflow-y-auto">
					<div className="grid grid-cols-[64px_repeat(7,1fr)]">
						<div className="border-r border-neutral-200 bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-700">
							{HOURS.map((hour) => (
								<div
									key={hour}
									className="h-12 border-b border-neutral-200 dark:border-neutral-700 flex items-start justify-end pr-3 pt-1 text-xxs text-neutral-400 dark:text-brand-foreground"
								>
									{formatHourLabel(hour)}
								</div>
							))}
						</div>

						{weekDays.map((day, dayIndex) => {
							const dayKey = day.day.format("YYYY-MM-DD");
							const dayFragments = dayRenderMap.get(dayKey) ?? [];

							return (
								<div
									key={`${day.label}-${dayIndex}`}
									className="relative border-r last:border-r-0 border-neutral-200 dark:border-neutral-700"
								>
									{HOURS.map((hour) => (
										<CalendarDayHourBox
											key={`${dayIndex}-${hour}`}
											day={day.day}
											hour={hour}
										/>
									))}

									<CalendarEventsLayer fragments={dayFragments} />
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
