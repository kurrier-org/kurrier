import { connection } from "next/server";
import { Suspense } from "react";
import { DASHBOARD_SIDEBAR_WIDTHS } from "@/components/dashboard/dashboard-loading";
import { SidebarProvider } from "@/components/ui/sidebar";
import { fetchWorkspace } from "@/lib/actions/workspace";
import { getDictionary } from "@/lib/dictionaries";

async function StorageLimitBanner({ locale }: { locale: string }) {
	await connection();

	const [workspace, dict] = await Promise.all([
		fetchWorkspace(),
		getDictionary(locale),
	]);

	if (!workspace?.isStorageOverLimit) {
		return null;
	}

	return (
		<div className="bg-red-100 w-full mb-4 rounded text-center z-10 text-sm text-red-700 p-2">
			{dict.dashboard.storageOverLimit}
		</div>
	);
}

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	return (
		<>
			<Suspense fallback={null}>
				<StorageLimitBanner locale={locale} />
			</Suspense>

			<SidebarProvider
				style={
					{
						"--sidebar-width": DASHBOARD_SIDEBAR_WIDTHS.default,
					} as React.CSSProperties
				}
			>
				{children}
			</SidebarProvider>
		</>
	);
}
