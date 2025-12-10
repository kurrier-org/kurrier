import { getDayjsTz } from "@common/day-js-extended";
import { CalendarEventEntity } from "@db";
import { AllDayFragment, CalendarState } from "@schema";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import CalendarAddEventPopover from "@/components/dashboard/calendars/calendar-add-event-popover";
import { useState } from "react";

type WeekDayMeta = {
	label: string;
	date: number;
	isSameDay: boolean;
	day: ReturnType<ReturnType<typeof getDayjsTz>>;
};

type AllDayRenderFragment = {
	event: CalendarEventEntity;
	row: number;
	startIndex: number;
	endIndex: number;
	isStart: boolean;
	isEnd: boolean;
};

export default function AllDayEventsRow({
	weekDays,
	allDayByDay,
}: {
	weekDays: WeekDayMeta[];
	allDayByDay: Map<string, AllDayFragment[]>;
}) {
	const { state, setState } = useDynamicContext<CalendarState>();
	const dayjsTz = getDayjsTz(state.defaultCalendar.timezone);

	const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

	const dayKeyToIndex = new Map<string, number>();
	weekDays.forEach((d, idx) => {
		dayKeyToIndex.set(d.day.format("YYYY-MM-DD"), idx);
	});

	const fragments: AllDayFragment[] = [];
	for (const day of weekDays) {
		const dayKey = day.day.format("YYYY-MM-DD");
		const bucket = allDayByDay.get(dayKey) ?? [];
		for (const frag of bucket) {
			fragments.push(frag);
		}
	}

	if (!fragments.length) return null;
	const byEvent = new Map<
		string,
		{
			event: CalendarEventEntity;
			dayIndices: number[];
			isStart: boolean;
			isEnd: boolean;
		}
	>();

	for (const frag of fragments) {
		const id = frag.event.id;
		const dayIndex = dayKeyToIndex.get(frag.date);
		if (dayIndex == null) continue;

		const existing = byEvent.get(id);
		if (existing) {
			existing.dayIndices.push(dayIndex);
			existing.isStart = existing.isStart || frag.isStart;
			existing.isEnd = existing.isEnd || frag.isEnd;
		} else {
			byEvent.set(id, {
				event: frag.event,
				dayIndices: [dayIndex],
				isStart: frag.isStart,
				isEnd: frag.isEnd,
			});
		}
	}

	const eventsForLayout: {
		event: CalendarEventEntity;
		startIndex: number;
		endIndex: number;
		isStart: boolean;
		isEnd: boolean;
	}[] = [];

	for (const { event, dayIndices, isStart, isEnd } of byEvent.values()) {
		const sorted = Array.from(new Set(dayIndices)).sort((a, b) => a - b);
		if (!sorted.length) continue;
		eventsForLayout.push({
			event,
			startIndex: sorted[0],
			endIndex: sorted[sorted.length - 1],
			isStart,
			isEnd,
		});
	}

	eventsForLayout.sort((a, b) => {
		if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
		return a.endIndex - b.endIndex;
	});

	const occupied: boolean[][] = [];
	const renderFragments: AllDayRenderFragment[] = [];

	for (const item of eventsForLayout) {
		const spanDays = [];
		for (let i = item.startIndex; i <= item.endIndex; i++) spanDays.push(i);

		let row = 0;
		while (true) {
			if (!occupied[row]) occupied[row] = [];
			const rowBusy = occupied[row];
			const hasOverlap = spanDays.some((dIdx) => rowBusy[dIdx]);
			if (!hasOverlap) {
				spanDays.forEach((dIdx) => {
					rowBusy[dIdx] = true;
				});
				renderFragments.push({
					event: item.event,
					row,
					startIndex: item.startIndex,
					endIndex: item.endIndex,
					isStart: item.isStart,
					isEnd: item.isEnd,
				});
				break;
			}
			row++;
		}
	}

	const rowCount = occupied.length || 1;
	const rowHeight = 22;

	const handleClick = (
		ev: React.MouseEvent<HTMLDivElement>,
		event: CalendarEventEntity,
		popoverKey: string,
	) => {
		ev.stopPropagation();
		setState((prev) => ({
			...prev,
			activePopoverEditEvent: event,
		}));
		setOpenPopoverId(popoverKey);
	};

	return (
		<div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 w-full">
			<div className="flex items-center justify-start px-3 py-1 text-xxs text-neutral-500 dark:text-brand-foreground">
				All day
			</div>
			<div className="relative col-span-7">
				{weekDays.map((_, idx) => (
					<div
						key={idx}
						className="absolute top-0 bottom-0 border-r last:border-r-0 border-neutral-200/60 dark:border-neutral-700/60 pointer-events-none"
						style={{
							left: `${(idx / 7) * 100}%`,
							width: `${100 / 7}%`,
						}}
					/>
				))}

				<div
					className="relative pointer-events-none"
					style={{ height: rowCount * rowHeight }}
				>
					{renderFragments.map((frag) => {
						const start = dayjsTz(frag.event.startsAt);
						const end = dayjsTz(frag.event.endsAt);
						const left = (frag.startIndex / 7) * 100;
						const width = ((frag.endIndex - frag.startIndex + 1) / 7) * 100;

						const popoverKey = (frag.event as any).instanceId ?? frag.event.id;
						const opened = openPopoverId === popoverKey;

						return (
							<CalendarAddEventPopover
								key={`${frag.event.id}-${frag.startIndex}-${frag.endIndex}`}
								opened={opened}
								onChange={() => {
									setOpenPopoverId(null);
								}}
								start={start}
								end={end}
							>
								<div
									className="absolute px-1 rounded-sm bg-brand/80 text-[10px] text-white truncate cursor-pointer pointer-events-auto flex items-center"
									style={{
										top: frag.row * rowHeight + 2,
										left: `${left}%`,
										width: `${width}%`,
										height: rowHeight - 4,
									}}
									onClick={(ev) => handleClick(ev, frag.event, popoverKey)}
									title={frag.event.title}
								>
									<span className="truncate font-medium">
										{frag.event.title}
									</span>
								</div>
							</CalendarAddEventPopover>
						);
					})}
				</div>
			</div>
		</div>
	);
}
