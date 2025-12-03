import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import CalendarTopBar from "@/components/dashboard/calendars/calendar-top-bar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { CalendarState } from "@schema";
import { fetchDefaultCalendar, fetchOrganizers } from "@/lib/actions/calendar";
import { getTimeZones } from "@vvo/tzdb";

export default async function CalendarLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [defaultCalendar, organizers] = await Promise.all([
		fetchDefaultCalendar(),
		fetchOrganizers(),
	]);

	const timeZones = getTimeZones({ includeUtc: true });
	let defaultTzAbbr = "UTC";
	const abbr = timeZones.find(
		(tz) => tz.name === defaultCalendar.timezone,
	)?.abbreviation;
	const tzAbbr = abbr ?? defaultTzAbbr;
	const tzName =
		timeZones.find((tz) => tz.abbreviation === tzAbbr)?.name ?? tzAbbr;
	const initialState: CalendarState = {
		defaultCalendar,
		calendarTzAbbr: tzAbbr,
		calendarTzName: tzName,
		organizers,
	};

	return (
		<>
			<DynamicContextProvider initialState={initialState}>
				<header className="flex items-center gap-2 border-b  bg-background/60 backdrop-blur py-3 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="data-[orientation=vertical]:h-4"
					/>
					<CalendarTopBar />
				</header>

				<main>
					<section className="">{children}</section>
				</main>
			</DynamicContextProvider>
		</>
	);
}
