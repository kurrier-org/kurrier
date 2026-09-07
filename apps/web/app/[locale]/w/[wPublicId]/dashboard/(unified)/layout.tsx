import { SidebarProvider } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { access } from "@/lib/actions/shared";

export default async function DashboardLayout({
												  children,
												  params,
											  }: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	const { canUseWorkspace } = await access("canUseWorkspace");

	if (!canUseWorkspace) {
		redirect(`/${locale}/auth/login`);
	}

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "250px",
				} as React.CSSProperties
			}
			className="sidebar-animation"
		>
			{children}
		</SidebarProvider>
	);
}
