import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { CalendarState } from "@schema";
import * as React from "react";
import NewEventButton from "@/components/dashboard/calendars/new-event-button";
import {
	fetchDefaultCalendar,
	fetchOrganizers,
} from "@/lib/actions/calendar";
import { getTimeZones } from "@vvo/tzdb";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {Suspense} from "react";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import CalendarSidebarWrapper from "@/components/dashboard/calendars/calendar-sidebar-wrapper";

export default async function DashboardLayout({
												  children,
											  }: {
	children: React.ReactNode;
}) {
	const [defaultCalendar, organizers, workspacePublicId] =
		await Promise.all([
			fetchDefaultCalendar(),
			fetchOrganizers(),
			getWorkspacePublicId(),
		]);

	const timeZones = getTimeZones({ includeUtc: true });

	const tz = defaultCalendar?.timezone ?? "UTC";

	const abbr =
		timeZones.find((tzObj) => tzObj.name === tz)?.abbreviation ?? "UTC";

	const tzName =
		timeZones.find((tzObj) => tzObj.abbreviation === abbr)?.name ?? abbr;

	const initialState: CalendarState = {
		defaultCalendar: defaultCalendar ?? null,
		calendarTzAbbr: abbr,
		calendarTzName: tzName,
		organizers,
	};

	const organizersKey = organizers
		.map((o) => `${o.value}:${o.displayName ?? ""}`)
		.join("|");

	const calendarContextKey = [
		defaultCalendar?.id ?? "none",
		tz,
		organizersKey,
	].join("::");

	return (
		<DynamicContextProvider
			key={calendarContextKey}
			initialState={initialState}
		>
			<AppSidebar
				workspacePublicId={workspacePublicId}
				sidebarSectionContent={
					<Suspense fallback={<Loading />}>
						{defaultCalendar && <CalendarSidebarWrapper />}
					</Suspense>
				}
				navUserContent={
					<Suspense fallback={<Loading />}>
						<NavUserWrapper />
					</Suspense>
				}
				sidebarTopContent={
					<Suspense fallback={<Loading />}>
						{defaultCalendar && <div className="-mt-1">
							<NewEventButton
								workspacePublicId={workspacePublicId}
								hideOnMobile
							/>
						</div>}
					</Suspense>
				}
			/>

			<SidebarInset>
				{defaultCalendar ? (
					children
				) : (
					<div className="flex h-full items-center justify-center text-muted-foreground">
						No calendar found. Connect an identity to create one.
					</div>
				)}
			</SidebarInset>
		</DynamicContextProvider>
	);
}
