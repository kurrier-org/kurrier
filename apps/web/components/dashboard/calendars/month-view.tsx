"use client";

import { getDayjsTz } from "@common/day-js-extended";
import type { CalendarEventAttendeeEntity, CalendarEventEntity } from "@db";
import type {
	AllDayFragment,
	CalendarState,
	ComposeContact,
	EventSlotFragment,
} from "@schema";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useI18n } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

type MonthGridProps = {
	events: CalendarEventEntity[];
	attendees: Record<string, CalendarEventAttendeeEntity[]>;
	byDayMap: Map<string, EventSlotFragment[]>;
	attendeeContacts: Promise<ComposeContact[]>;
	allDayByDay: Map<string, AllDayFragment[]>;
	workspacePublicId: string;
};

const MAX_ITEMS_PER_DAY = 4;

export default function MonthGrid({
	events,
	attendees,
	byDayMap,
	attendeeContacts,
	workspacePublicId,
}: MonthGridProps) {
	const { dict, format } = useI18n();
	const { state, setState } = useDynamicContext<CalendarState>();
	const params = useParams();
	const router = useRouter();
	const contacts = React.use(attendeeContacts);
	const dayjsTz = getDayjsTz(state.defaultCalendar.timezone);
	const today = dayjsTz();

	useEffect(() => {
		setState((prev) => ({
			...prev,
			calendarEvents: events,
			calendarEventAttendees: attendees,
			attendeeContacts: contacts,
		}));
	}, [events, attendees, contacts, setState]);

	const baseDay =
		params.year && params.month && params.day
			? dayjsTz()
					.year(Number(params.year))
					.month(Number(params.month) - 1)
					.date(Number(params.day))
			: dayjsTz();

	const monthStart = baseDay.startOf("month");
	const monthEnd = baseDay.endOf("month");
	const gridStart = monthStart.startOf("week");
	const gridEnd = monthEnd.endOf("week");

	type DayObj = {
		key: string;
		isCurrentMonth: boolean;
		isToday: boolean;
		dayNum: number;
		date: ReturnType<typeof dayjsTz>;
	};

	const days: DayObj[] = [];
	let cursor = gridStart;

	while (cursor.isBefore(gridEnd) || cursor.isSame(gridEnd, "day")) {
		const key = cursor.format("YYYY-MM-DD");
		days.push({
			key,
			isCurrentMonth: cursor.month() === monthStart.month(),
			isToday: cursor.isSame(today, "day"),
			dayNum: cursor.date(),
			date: cursor,
		});
		cursor = cursor.add(1, "day");
	}

	const goToDay = (d: ReturnType<typeof dayjsTz>) => {
		const year = d.year();
		const month = d.month() + 1;
		const day = d.date();
		router.push(
			`/w/${workspacePublicId}/dashboard/calendar/${state.defaultCalendar.publicId}/day/${year}/${month}/${day}`,
		);
	};

	return (
		<div className="h-full w-full overflow-x-auto">
			<div className="flex min-w-[42rem] flex-col xl:min-w-0">
				<div className="grid grid-cols-7 text-xxs uppercase tracking-wide text-neutral-500 dark:text-brand-foreground border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
					{[
						dict?.calendar?.weekdayMon ?? "Mo",
						dict?.calendar?.weekdayTue ?? "Tu",
						dict?.calendar?.weekdayWed ?? "We",
						dict?.calendar?.weekdayThu ?? "Th",
						dict?.calendar?.weekdayFri ?? "Fr",
						dict?.calendar?.weekdaySat ?? "Sa",
						dict?.calendar?.weekdaySun ?? "Su",
					].map((label) => (
						<div key={label} className="px-3 py-2 text-left">
							{label}
						</div>
					))}
				</div>
				<div className="grid h-[calc(100svh-8rem)] grid-cols-7 grid-rows-6">
					{days.map((dayMeta) => {
						const daySlots = byDayMap.get(dayMeta.key) ?? [];
						const visibleSlots = daySlots.slice(0, MAX_ITEMS_PER_DAY);
						const remaining = daySlots.length - visibleSlots.length;

						const baseCellClasses =
							"relative border-r border-neutral-200 dark:border-neutral-700 overflow-hidden px-2 py-1 cursor-pointer";
						const monthTint = dayMeta.isCurrentMonth
							? "bg-neutral-50 dark:bg-neutral-900"
							: "bg-neutral-50 dark:bg-neutral-900";

						return (
							<div
								key={dayMeta.key}
								className={`${baseCellClasses} ${monthTint} border-b hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors duration-150`}
							>
								<button
									type="button"
									className="absolute inset-0"
									onClick={() => goToDay(dayMeta.date)}
								>
									<span className="sr-only">
										{dayMeta.date.format("YYYY-MM-DD")}
									</span>
								</button>
								<div className="pointer-events-none flex items-center justify-between mb-2">
									<div
										className={`w-6 h-6 flex items-center justify-center rounded-full text-xxs ${
											!dayMeta.isCurrentMonth
												? "text-neutral-400 dark:text-neutral-600"
												: dayMeta.isToday
													? "bg-brand text-white"
													: "text-neutral-700 dark:text-neutral-300"
										}`}
									>
										{dayMeta.dayNum}
									</div>
								</div>

								<div className="pointer-events-none space-y-0.5">
									{visibleSlots.map((slot) => {
										const ev = slot.event;
										const key = ev.instanceId ?? ev.id;
										const title =
											ev.title?.trim() ||
											(dict?.calendar?.noTitle ?? "(no title)");
										const startLabel = ev.isAllDay
											? null
											: (format?.time(dayjsTz(ev.startsAt).toDate(), {
													timeZone: state.defaultCalendar.timezone,
												}) ?? "");

										return (
											<div
												key={key}
												className="w-full px-2 py-[3px] rounded-md text-[11px] flex items-center gap-1 truncate bg-brand/10 dark:bg-brand/20 border border-brand/20"
												title={startLabel ? `${startLabel} – ${title}` : title}
											>
												<span className="inline-block w-1 h-1 rounded-full bg-brand-500" />
												<span className="truncate">
													{startLabel ? `${startLabel} ${title}` : title}
												</span>
											</div>
										);
									})}

									{remaining > 0 && (
										<div className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">
											+{remaining} {dict?.calendar?.more ?? "more"}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
