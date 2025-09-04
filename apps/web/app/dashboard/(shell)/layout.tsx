import { AppSidebar } from "@/components/ui/dashboards/workspace/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function DashboardLayout({
	children,
    breadcrumb,
}: {
	children: React.ReactNode;
	breadcrumb: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
                        {breadcrumb ?? null} {/* fallback if no breadcrumb provided */}

                        {/*<Breadcrumb>*/}
						{/*	<BreadcrumbList>*/}
						{/*		<BreadcrumbItem className="hidden md:block">*/}
						{/*			<BreadcrumbLink href="#">*/}
						{/*				Building Your Application*/}
						{/*			</BreadcrumbLink>*/}
						{/*		</BreadcrumbItem>*/}
						{/*		<BreadcrumbSeparator className="hidden md:block" />*/}
						{/*		<BreadcrumbItem>*/}
						{/*			<BreadcrumbPage>Data Fetching</BreadcrumbPage>*/}
						{/*		</BreadcrumbItem>*/}
						{/*	</BreadcrumbList>*/}
						{/*</Breadcrumb>*/}
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					{children}
					{/*<div className="grid auto-rows-min gap-4 md:grid-cols-3">*/}
					{/*    <div className="bg-muted/50 aspect-video rounded-xl" />*/}
					{/*    <div className="bg-muted/50 aspect-video rounded-xl" />*/}
					{/*    <div className="bg-muted/50 aspect-video rounded-xl" />*/}
					{/*</div>*/}
					{/*<div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />*/}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
