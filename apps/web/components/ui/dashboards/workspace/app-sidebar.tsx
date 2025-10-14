"use client";

import * as React from "react";
import { BookOpen, LayoutDashboard, Plug, Send } from "lucide-react";

import { NavMain } from "@/components/ui/dashboards/workspace/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import KurrierLogo from "@/components/common/kurrier-logo";
import Link from "next/link";
import { PublicConfig } from "@schema";
import { UserResponse } from "@supabase/supabase-js";
import { NavUser } from "@/components/ui/dashboards/workspace/nav-user";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
	publicConfig: PublicConfig;
	user: UserResponse["data"]["user"];
	avatar: string;
};

export function AppSidebar({ ...props }: AppSidebarProps) {
	const { publicConfig, user, avatar, ...restProps } = props;

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
				items: [],
			},
			{
				title: "Identities",
				url: "/dashboard/identities",
				icon: Send,
				items: [],
			},
		],
		navSecondary: [
			{
				title: "Docs",
				url: props.publicConfig.DOCS_URL ?? "https://docs.kurrier.org",
				icon: BookOpen,
			},
		],
	};

	return (
		<Sidebar variant="inset" {...restProps}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<Link
							href="/dashboard"
							className={"flex justify-start mx-1 items-center gap-1"}
						>
							<KurrierLogo size={30} />
							<span className="truncate font-medium text-xl">Kurrier</span>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} avatar={avatar} />
			</SidebarFooter>
		</Sidebar>
	);
}
