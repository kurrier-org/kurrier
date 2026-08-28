"use client";
import { getDayjsTz } from "@common/day-js-extended";
import { ActionIcon, Button, SegmentedControl } from "@mantine/core";
import {
	type CalendarState,
	type CalendarViewType,
	calendarViewsList,
} from "@schema";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import NewEventButton from "@/components/dashboard/calendars/new-event-button";
import { useAppearance } from "@/components/providers/appearance-provider";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

const VIEW_LABEL_KEYS: Record<string, string> = {
	day: "viewDay",
	week: "viewWeek",
	month: "viewMonth",
	year: "viewYear",
};

function CalendarTopBar({ workspacePublicId }: { workspacePublicId: string }) {
	const dict = useOptionalDictionary();
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
		return `/w/${workspacePublicId}/dashboard/calendar/${calendarPublicId}/${view}/${year}/${month}/${date}`;
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
		<div className="flex min-w-0 w-full flex-col gap-3 p-1 sm:p-2 xl:flex-row xl:items-center xl:justify-between">
			<div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4 xl:flex-nowrap xl:gap-6">
				<Button
					w="auto"
					onClick={goToToday}
					size="sm"
					variant="light"
					className="rounded-full"
				>
					{dict?.calendar?.today ?? "Today"}
				</Button>

				<div className="flex gap-2 items-center">
					<ActionIcon variant="subtle" onClick={prev}>
						<ChevronLeft size={24} />
					</ActionIcon>
					<ActionIcon variant="subtle" onClick={next}>
						<ChevronRight size={24} />
					</ActionIcon>
				</div>

				<div className="min-w-0 flex-1 text-brand dark:text-brand-foreground font-medium sm:flex-none">
					<h1 className="truncate text-base sm:text-xl xl:text-2xl">
						{currentViewTitle}
					</h1>
				</div>

				<NewEventButton
					compact
					workspacePublicId={workspacePublicId}
					className="ml-auto md:hidden"
				/>
			</div>

			<div className="max-w-full overflow-x-auto pb-1 xl:pb-0">
				<SegmentedControl
					onChange={switchView}
					radius={20}
					withItemsBorders={false}
					size="sm"
					value={String(activeView)}
					color={theme}
					data={calendarViewsList.map((item) => ({
						label: (
							<span className="capitalize">
								{(dict?.calendar as Record<string, string> | undefined)?.[
									VIEW_LABEL_KEYS[item]
								] ?? item}
							</span>
						),
						value: item,
					}))}
				/>
			</div>
		</div>
	);
}

export default CalendarTopBar;
