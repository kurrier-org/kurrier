import type { CalendarState } from "@schema";
import { getTimeZones } from "@vvo/tzdb";
import { CalendarDays } from "lucide-react";
import type * as React from "react";
import { cache, Suspense } from "react";
import ContentPlaceholder from "@/components/common/content-placeholder";
import CalendarSidebarWrapper from "@/components/dashboard/calendars/calendar-sidebar-wrapper";
import CalendarTopBar from "@/components/dashboard/calendars/calendar-top-bar";
import NewEventButton from "@/components/dashboard/calendars/new-event-button";
import {
	DASHBOARD_SIDEBAR_WIDTHS,
	DashboardContentLoading,
	DashboardHeaderLoading,
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

const loadCalendarDashboardData = cache(async (locale: string) => {
	const [defaultCalendar, organizers, workspacePublicId, dict] =
		await Promise.all([
			fetchDefaultCalendar(),
			fetchOrganizers(),
			getWorkspacePublicId(),
			getDictionary(locale),
		]);

	const timeZones = getTimeZones({ includeUtc: true });
	const timezone = defaultCalendar?.timezone ?? "UTC";
	const abbreviation =
		timeZones.find((item) => item.name === timezone)?.abbreviation ?? "UTC";
	const timezoneName =
		timeZones.find((item) => item.abbreviation === abbreviation)?.name ??
		abbreviation;

	const initialState: CalendarState = {
		defaultCalendar: defaultCalendar ?? null,
		calendarTzAbbr: abbreviation,
		calendarTzName: timezoneName,
		organizers,
	};
	const organizersKey = organizers
		.map((organizer) => `${organizer.value}:${organizer.displayName ?? ""}`)
		.join("|");
	const contextKey = [
		defaultCalendar?.id ?? "none",
		timezone,
		organizersKey,
	].join("::");

	return {
		contextKey,
		defaultCalendar,
		dict,
		initialState,
		workspacePublicId,
	};
});

type CalendarLayoutProps = {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
};

async function CalendarSidebarAction({
	params,
}: Pick<CalendarLayoutProps, "params">) {
	const { locale } = await params;
	const { contextKey, defaultCalendar, initialState, workspacePublicId } =
		await loadCalendarDashboardData(locale);

	if (!defaultCalendar) return null;

	return (
		<DynamicContextProvider key={contextKey} initialState={initialState}>
			<div className="-mt-1">
				<NewEventButton
					workspacePublicId={workspacePublicId}
					className="hidden md:inline-flex"
				/>
			</div>
		</DynamicContextProvider>
	);
}

async function CalendarSidebarSection({
	params,
}: Pick<CalendarLayoutProps, "params">) {
	const { locale } = await params;
	const { contextKey, defaultCalendar, initialState, workspacePublicId } =
		await loadCalendarDashboardData(locale);

	if (!defaultCalendar) return null;

	return (
		<DynamicContextProvider key={contextKey} initialState={initialState}>
			<CalendarSidebarWrapper
				defaultCalendar={defaultCalendar}
				workspacePublicId={workspacePublicId}
			/>
		</DynamicContextProvider>
	);
}

async function CalendarContent({ children, params }: CalendarLayoutProps) {
	const { locale } = await params;
	const { contextKey, defaultCalendar, dict, initialState, workspacePublicId } =
		await loadCalendarDashboardData(locale);
	const emptyCalendarTitle =
		dict.calendar.emptyTitle ?? dict.calendar.noCalendarFound;

	return (
		<DynamicContextProvider key={contextKey} initialState={initialState}>
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
		</DynamicContextProvider>
	);
}

export default function DashboardLayout({
	children,
	params,
}: CalendarLayoutProps) {
	return (
		<>
			<AppSidebar
				style={
					{
						"--sidebar-width": DASHBOARD_SIDEBAR_WIDTHS.calendar,
					} as React.CSSProperties
				}
				sidebarSectionContent={
					<Suspense fallback={<DashboardSidebarSectionLoading />}>
						<CalendarSidebarSection params={params} />
					</Suspense>
				}
				navUserContent={
					<Suspense fallback={<DashboardSidebarFooterLoading />}>
						<NavUserWrapper />
					</Suspense>
				}
				sidebarTopContent={
					<Suspense fallback={<DashboardSidebarActionLoading />}>
						<CalendarSidebarAction params={params} />
					</Suspense>
				}
			/>

			<SidebarInset>
				<Suspense
					fallback={
						<>
							<DashboardHeaderLoading />
							<DashboardContentLoading />
						</>
					}
				>
					<CalendarContent params={params}>{children}</CalendarContent>
				</Suspense>
			</SidebarInset>
		</>
	);
}
