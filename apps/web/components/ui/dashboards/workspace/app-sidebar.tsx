"use client";

import * as React from "react";
import {
	BookOpen,
	LayoutDashboard,
	LifeBuoy,
	Mail,
	Plug,
	Send,
} from "lucide-react";

import { NavMain } from "@/components/ui/dashboards/workspace/nav-main";
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
			title: "Providers",
			url: "/dashboard/providers",
			icon: Plug,
			items: [
				// { title: "Linked Providers", url: "/dashboard/providers" },
				// { title: "Add Provider", url: "/dashboard/providers/new" },
			],
		},
		{
			title: "Identities",
			url: "/dashboard/identities",
			icon: Send, // or Mail icon if you prefer
			items: [
				// { title: "List", url: "/dashboard/identities" },
				// { title: "Add Identity", url: "/dashboard/identities/new" },
			],
		},
	],
	navSecondary: [{ title: "Docs", url: "/docs", icon: BookOpen }],
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
