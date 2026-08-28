import type { CalendarState } from "@schema";
import { getTimeZones } from "@vvo/tzdb";
import { CalendarDays } from "lucide-react";
import type * as React from "react";
import { Suspense } from "react";
import ContentPlaceholder from "@/components/common/content-placeholder";
import CalendarSidebarWrapper from "@/components/dashboard/calendars/calendar-sidebar-wrapper";
import CalendarTopBar from "@/components/dashboard/calendars/calendar-top-bar";
import NewEventButton from "@/components/dashboard/calendars/new-event-button";
import {
	DASHBOARD_SIDEBAR_WIDTHS,
	DashboardShellLoading,
	DashboardSidebarActionLoading,
	DashboardSidebarFooterLoading,
	DashboardSidebarSectionLoading,
} from "@/components/dashboard/dashboard-loading";
import DashboardPageHeader from "@/components/dashboard/dashboard-page-header";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { fetchDefaultCalendar, fetchOrganizers } from "@/lib/actions/calendar";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { getDictionary } from "@/lib/dictionaries";

async function CalendarDashboard({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	const [defaultCalendar, organizers, workspacePublicId, dict] =
		await Promise.all([
			fetchDefaultCalendar(),
			fetchOrganizers(),
			getWorkspacePublicId(),
			getDictionary(locale),
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
	const emptyCalendarTitle =
		dict.calendar.emptyTitle ?? dict.calendar.noCalendarFound;

	return (
		<DynamicContextProvider
			key={calendarContextKey}
			initialState={initialState}
		>
			<AppSidebar
				workspacePublicId={workspacePublicId}
				style={
					{
						"--sidebar-width": DASHBOARD_SIDEBAR_WIDTHS.calendar,
					} as React.CSSProperties
				}
				sidebarSectionContent={
					<Suspense fallback={<DashboardSidebarSectionLoading />}>
						{defaultCalendar && <CalendarSidebarWrapper />}
					</Suspense>
				}
				navUserContent={
					<Suspense fallback={<DashboardSidebarFooterLoading />}>
						<NavUserWrapper />
					</Suspense>
				}
				sidebarTopContent={
					<Suspense fallback={<DashboardSidebarActionLoading />}>
						{defaultCalendar && (
							<div className="-mt-1">
								<NewEventButton
									workspacePublicId={workspacePublicId}
									className="hidden md:inline-flex"
								/>
							</div>
						)}
					</Suspense>
				}
			/>

			<SidebarInset>
				{defaultCalendar ? (
					<header className="flex min-w-0 shrink-0 items-start gap-2 border-b bg-background/60 px-3 py-2 backdrop-blur sm:items-center sm:px-4 sm:py-3">
						<SidebarTrigger className="-ml-1 size-11 shrink-0 md:size-7" />
						<Separator
							orientation="vertical"
							className="mt-3 data-[orientation=vertical]:h-4 sm:mt-1.5"
						/>
						<CalendarTopBar workspacePublicId={workspacePublicId} />
					</header>
				) : (
					<DashboardPageHeader title={dict.calendar.calendar ?? "Calendar"} />
				)}

				{defaultCalendar ? (
					children
				) : (
					<ContentPlaceholder
						icon={<CalendarDays className="size-5" aria-hidden="true" />}
						title={emptyCalendarTitle}
						description={dict.calendar.emptyDescription}
					/>
				)}
			</SidebarInset>
		</DynamicContextProvider>
	);
}

export default function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	return (
		<Suspense
			fallback={
				<DashboardShellLoading
					sidebarWidth={DASHBOARD_SIDEBAR_WIDTHS.calendar}
				/>
			}
		>
			<CalendarDashboard params={params}>{children}</CalendarDashboard>
		</Suspense>
	);
}
