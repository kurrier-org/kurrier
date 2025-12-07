"use client";
import React from "react";
import { Dayjs } from "dayjs";
import CalendarBoxIndicatorLayer from "@/components/dashboard/calendars/calendar-box-indicator-layer";
import CalendarAddEventPopover from "@/components/dashboard/calendars/calendar-add-event-popover";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

export default function CalendarDayHourBox({
	day,
	hour,
}: {
	day: Dayjs;
	hour: number;
}) {
	const start = day.hour(hour).minute(0).second(0).millisecond(0);
	const end = start.add(1, "hour");
	const { state, setState } = useDynamicContext();

	const id = React.useMemo(
		() => `${start.toISOString()}-${end.toISOString()}`,
		[start, end],
	);

	const handleBoxClick: React.MouseEventHandler<HTMLDivElement> = (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		setState((prev) => ({
			...prev,
			activePopoverId: id,
			activePopoverEditEvent: undefined
		}));
	};

	return (
		<div
			className={`border-b h-12 border-neutral-200 dark:border-neutral-700 cursor-pointer relative z-10`}
			data-start-iso={start.toISOString()}
			data-end-iso={end.toISOString()}
		>
			<CalendarBoxIndicatorLayer start={start} end={end} />

			<CalendarAddEventPopover
				opened={state.activePopoverId === id}
				onChange={() => {
					setState((prev) => ({
						...prev,
						activePopoverId: null,
						activePopoverEditEvent: undefined
					}));
				}}
				start={start}
				end={end}
			>
				<div className="absolute inset-0" onClick={handleBoxClick} />
			</CalendarAddEventPopover>
		</div>
	);
}
