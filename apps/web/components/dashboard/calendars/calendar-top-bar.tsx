"use client";
import React, { useEffect } from "react";
import { ActionIcon, Button, SegmentedControl } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppearance } from "@/components/providers/appearance-provider";
import { useParams, useRouter } from "next/navigation";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { CalendarState, calendarViewsList, CalendarViewType } from "@schema";
import { getDayjsTz } from "@common/day-js-extended";

function CalendarTopBar() {
	const { theme } = useAppearance();
	const router = useRouter();
	const { state, setState } = useDynamicContext<CalendarState>();

	const params = useParams();
	const calendarPublicId =
		params.calendarPublicId ?? state.defaultCalendar.publicId;

	const activeView: CalendarViewType =
		(params.view as CalendarViewType) ?? "week";

	const dayjsTzFactory = getDayjsTz(state.defaultCalendar.timezone);
	const today = dayjsTzFactory();

	const currentDay =
		params.year && params.month && params.day
			? dayjsTzFactory()
					.year(Number(params.year))
					.month(Number(params.month) - 1)
					.date(Number(params.day))
			: today;

	useEffect(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		setState((prev) => ({
			...prev,
			userTz: prev.userTz ?? tz,
		}));
	}, [setState]);

	let currentViewTitle = "";
	if (activeView === "week" || activeView === "month") {
		currentViewTitle = currentDay.format("MMMM YYYY");
	} else if (activeView === "year") {
		currentViewTitle = currentDay.format("YYYY");
	} else {
		currentViewTitle = currentDay.format("DD MMMM YYYY");
	}

	const buildPath = (view: CalendarViewType, day = currentDay) => {
		const year = day.year();
		const month = day.month() + 1;
		const date = day.date();
		return `/dashboard/calendar/${calendarPublicId}/${view}/${year}/${month}/${date}`;
	};

	const switchView = (value: CalendarViewType) => {
		router.push(buildPath(value));
	};

	const shiftCurrentDay = (direction: 1 | -1) => {
		const base = currentDay ?? today;
		let next = base;

		if (activeView === "day") next = base.add(direction, "day");
		else if (activeView === "week") next = base.add(direction, "week");
		else if (activeView === "month") next = base.add(direction, "month");
		else if (activeView === "year") next = base.add(direction, "year");

		router.push(buildPath(activeView, next));
	};

	const prev = () => shiftCurrentDay(-1);
	const next = () => shiftCurrentDay(1);

	const goToToday = () => {
		router.push(buildPath(activeView, today));
	};

	return (
		<div className="flex p-2 justify-between w-full">
			<div className="flex gap-6">
				<Button
					onClick={goToToday}
					size="sm"
					variant="light"
					className="rounded-full"
				>
					Today
				</Button>

				<div className="flex gap-2 items-center">
					<ActionIcon variant="subtle" onClick={prev}>
						<ChevronLeft size={24} />
					</ActionIcon>
					<ActionIcon variant="subtle" onClick={next}>
						<ChevronRight size={24} />
					</ActionIcon>
				</div>

				<div className="flex justify-center items-center text-brand dark:text-brand-foreground font-medium text-2xl">
					<h1>{currentViewTitle}</h1>
				</div>
			</div>

			<SegmentedControl
				onChange={switchView}
				radius={20}
				withItemsBorders={false}
				size="sm"
				value={String(activeView)}
				color={theme}
				data={calendarViewsList.map((item) => ({
					label: <span className="capitalize">{item}</span>,
					value: item,
				}))}
			/>
		</div>
	);
}

export default CalendarTopBar;
