import { Suspense } from "react";
import { connection } from "next/server";
import { SidebarProvider } from "@/components/ui/sidebar";
import WorkspaceThemeSync from "@/components/providers/workspace-theme-sync";
import { fetchWorkspace } from "@/lib/actions/workspace";
import { access } from "@/lib/actions/shared";
import { ThemeNameSchema } from "@schema/types/themes";
import Loading from "@/app/loading";

async function WorkspaceDashboard({ children }: { children: React.ReactNode }) {
	await connection();

	const { canSyncMail, reason } = await access("canSyncMail");
	const workspace = await fetchWorkspace();
	const theme = ThemeNameSchema.catch("indigo").parse(workspace?.theme);

	return (
		<SidebarProvider
			style={{ "--sidebar-width": "250px" } as React.CSSProperties}
			className="sidebar-animation"
		>
			<WorkspaceThemeSync theme={theme} />

			{!canSyncMail && (
				<div
					role="alert"
					className="fixed bottom-12 left-16 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg dark:bg-amber-950 dark:text-amber-100"
				>
					<div className="font-semibold">Mail synchronization paused</div>
					<p className="mt-1">
						{reason}. Update your billing or free up storage to resume
						synchronization.
					</p>
				</div>
			)}

			{children}
		</SidebarProvider>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Suspense fallback={<Loading />}>
			<WorkspaceDashboard>{children}</WorkspaceDashboard>
		</Suspense>
	);
}
