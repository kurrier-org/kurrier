"use client";

import * as React from "react";
import {
    Activity,
    BookOpen,
    Bot,
    Building2,
    Command,
    Frame,
    Inbox,
    Key,
    LayoutDashboard,
    LifeBuoy, Mail, Mailbox,
    Map,
    PieChart,
    Plug,
    Send,
    Settings2,
    SquareTerminal,
    User,
} from "lucide-react";

import { NavMain } from "@/components/ui/dashboards/workspace/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
	user: {
		name: "Kurrier User",
		email: "you@kurrier.dev",
		avatar: "/avatars/placeholder.png",
	},
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: LayoutDashboard,
			items: [],
		},
		{
			title: "Identities",
			url: "/dashboard/identities",
			icon: Send, // or Mail icon if you prefer
			items: [
				{ title: "List", url: "/dashboard/identities" },
				{ title: "Add Identity", url: "/dashboard/identities/new" },
			],
		},
		{
			title: "Providers",
			url: "/dashboard/providers",
			icon: Plug,
			items: [
				{ title: "Linked Providers", url: "/dashboard/providers" },
				{ title: "Add Provider", url: "/dashboard/providers/new" },
			],
		},
		{
			title: "Messages",
			url: "/dashboard/messages",
			icon: Inbox,
			items: [
				{ title: "Outbound (Sent)", url: "/dashboard/messages/outbound" },
				{ title: "Inbound (Received)", url: "/dashboard/messages/inbound" },
			],
		},
		{
			title: "Events & Logs",
			url: "/dashboard/events",
			icon: Activity,
			items: [
				{ title: "Delivery Events", url: "/dashboard/events" },
				{ title: "Webhooks", url: "/dashboard/webhooks" },
			],
		},
		{
			title: "Settings",
			url: "/dashboard/settings",
			icon: Settings2,
			items: [
				{ title: "Profile", url: "/dashboard/settings/profile", icon: User },
				{ title: "API Keys", url: "/dashboard/settings/keys", icon: Key },
				{
					title: "Organization",
					url: "/dashboard/settings/org",
					icon: Building2,
				},
			],
		},
	],
	navSecondary: [
		{ title: "Docs", url: "/docs", icon: BookOpen },
		{ title: "Support", url: "/support", icon: LifeBuoy },
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<a href="#">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<Mail className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">Kurrier</span>
									<span className="truncate text-xs">Enterprise</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				{/*<NavProjects projects={data.projects} />*/}
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
