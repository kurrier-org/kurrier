import type { CSSProperties } from "react";
import { Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const DASHBOARD_SIDEBAR_WIDTHS = {
	default: "300px",
	mail: "300px",
	calendar: "300px",
} as const;

const SIDEBAR_SKELETON_ITEMS = ["first", "second", "third", "fourth"];

type DashboardLoadingProps = {
	className?: string;
};

export function DashboardContentLoading({ className }: DashboardLoadingProps) {
	return (
		<output
			aria-label="Loading content"
			className={cn("flex min-h-0 flex-1 flex-col gap-5 p-4 sm:p-6", className)}
		>
			<div className="space-y-3" aria-hidden="true">
				<Skeleton className="h-7 w-44 motion-reduce:animate-none" />
				<Skeleton className="h-4 w-full max-w-xl motion-reduce:animate-none" />
			</div>
			<Skeleton
				className="min-h-64 flex-1 rounded-xl motion-reduce:animate-none"
				aria-hidden="true"
			/>
			<span className="sr-only">Loading</span>
		</output>
	);
}

export function DashboardHeaderLoading() {
	return (
		<header className="flex h-16 min-w-0 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
			<Skeleton className="size-7 motion-reduce:animate-none" />
			<Skeleton className="h-5 w-px motion-reduce:animate-none" />
			<Skeleton className="h-9 min-w-0 flex-1 motion-reduce:animate-none" />
		</header>
	);
}

export function DashboardSidebarSectionLoading() {
	return (
		<div className="space-y-3 px-4 py-3" aria-hidden="true">
			<Skeleton className="h-4 w-24 motion-reduce:animate-none" />
			{SIDEBAR_SKELETON_ITEMS.map((item) => (
				<Skeleton
					key={`sidebar-row-${item}`}
					className="h-8 w-full motion-reduce:animate-none"
				/>
			))}
		</div>
	);
}

export function DashboardSidebarFooterLoading() {
	return (
		<div className="flex items-center gap-2 p-2" aria-hidden="true">
			<Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
			<Skeleton className="hidden h-4 min-w-0 flex-1 md:block motion-reduce:animate-none" />
		</div>
	);
}

export function DashboardSidebarActionLoading() {
	return (
		<Skeleton
			className="h-10 w-full motion-reduce:animate-none"
			aria-hidden="true"
		/>
	);
}

export function DashboardSidebarLoading({
	sidebarWidth = DASHBOARD_SIDEBAR_WIDTHS.default,
}: {
	sidebarWidth?: string;
}) {
	return (
		<Sidebar
			collapsible="icon"
			className="overflow-hidden"
			style={{ "--sidebar-width": sidebarWidth } as CSSProperties}
		>
			<div className="flex h-full w-full" aria-hidden="true">
				<div className="flex w-[calc(var(--sidebar-width-icon)+1px)] shrink-0 flex-col items-center gap-4 border-r px-2 py-3">
					<Skeleton className="size-8 rounded-lg motion-reduce:animate-none" />
					{SIDEBAR_SKELETON_ITEMS.map((item) => (
						<Skeleton
							key={`sidebar-icon-${item}`}
							className="size-7 rounded-md motion-reduce:animate-none"
						/>
					))}
				</div>
				<div className="hidden min-w-0 flex-1 flex-col md:flex">
					<div className="space-y-4 border-b p-4">
						<Skeleton className="h-8 w-28 motion-reduce:animate-none" />
						<Skeleton className="h-10 w-full motion-reduce:animate-none" />
					</div>
					<DashboardSidebarSectionLoading />
				</div>
			</div>
		</Sidebar>
	);
}

export function DashboardShellLoading({
	sidebarWidth = DASHBOARD_SIDEBAR_WIDTHS.default,
}: {
	sidebarWidth?: string;
}) {
	return (
		<>
			<DashboardSidebarLoading sidebarWidth={sidebarWidth} />
			<SidebarInset aria-busy="true">
				<DashboardHeaderLoading />
				<DashboardContentLoading />
			</SidebarInset>
		</>
	);
}
