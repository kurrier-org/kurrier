"use client";

import * as React from "react";
import { useMemo } from "react";
import { BookOpen, LayoutDashboard, Plug, Send } from "lucide-react";

import { NavMain } from "@/components/ui/dashboards/workspace/nav-main";
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
import { Switch } from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { useAppearance } from "@/components/providers/appearance-provider";
import ThemeColorPicker from "@/components/common/theme-color-picker";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
	publicConfig: PublicConfig;
	user: UserResponse["data"]["user"];
	avatar: string;
};

export function AppSidebar({ ...props }: AppSidebarProps) {
	const { publicConfig, user, avatar, ...restProps } = props;

	const data = {
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

	const { mode, setMode } = useAppearance();

	const prefersDark = useMemo(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}, []);

	const isDark = useMemo(() => {
		if (mode === "dark") return true;
		if (mode === "light") return false;
		return prefersDark; // mode === "system"
	}, [mode, prefersDark]);

	return (
		<Sidebar variant="inset" {...restProps}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<Link
							href="/dashboard/platform/overview"
							className={"flex justify-start mx-1 items-center gap-1"}
						>
							<KurrierLogo size={30} />
							<span className="truncate font-medium text-xl">Kurrier</span>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className={"relative"}>
				<NavMain items={data.navMain} />
				<div className={"absolute bottom-2 left-2 flex gap-2"}>
					<Switch
						size="sm"
						checked={!isDark}
						onChange={(e) =>
							setMode(e.currentTarget.checked ? "light" : "dark")
						}
						onLabel={<IconSun size={16} stroke={2.5} />}
						offLabel={<IconMoonStars size={16} stroke={2.5} />}
						aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
					/>
					<ThemeColorPicker />
				</div>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} avatar={avatar} />
			</SidebarFooter>
		</Sidebar>
	);
}
