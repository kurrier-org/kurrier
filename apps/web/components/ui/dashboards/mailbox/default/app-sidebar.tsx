"use client";

import * as React from "react";
import { Command } from "lucide-react";

import { NavUser } from "@/components/ui/dashboards/workspace/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { IdentityEntity, MailboxEntity } from "@db";
import { MailboxNav } from "@/components/mailbox/default/mailbox-nav";
import ComposeMail from "@/components/mailbox/default/compose-mail";
import { PublicConfig } from "@schema";
import KurrierLogo from "@/components/common/kurrier-logo";
import { UserResponse } from "@supabase/supabase-js";
import Link from "next/link";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { useAppearance } from "@/components/providers/appearance-provider";
import { useEffect, useMemo } from "react";
import { Switch } from "@mantine/core";
import ThemeColorPicker from "@/components/common/theme-color-picker";

const data = {
	navMain: [],
	mails: [],
};

export function AppSidebar({
	activeMailbox,
	mailboxList,
	identity,
	publicConfig,
	user,
	avatar,
	...rest
}: React.ComponentProps<typeof Sidebar> & {
	activeMailbox: MailboxEntity;
	mailboxList: MailboxEntity[];
	identity: IdentityEntity;
	publicConfig: PublicConfig;
	user: UserResponse["data"]["user"];
	avatar: string;
}) {
	// Note: I'm using state to show active item.
	// IRL you should use the url/router.

	const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
	const [mails, setMails] = React.useState(data.mails);
	const { setOpen } = useSidebar();

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

	useEffect(() => {});

	return (
		<Sidebar
			collapsible="icon"
			className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
			{...rest}
		>
			{/* This is the first sidebar */}
			{/* We disable collapsible and adjust width to icon. */}
			{/* This will make the sidebar appear as icons. */}
			<Sidebar
				collapsible="none"
				className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
			>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
								<Link href="/dashboard/platform/overview">
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<Command className="size-4" />
									</div>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent className={"relative"}>
					<SidebarGroup>
						<SidebarGroupContent className="px-1.5 md:px-0">
							<SidebarMenu></SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<div
						className={
							"absolute bottom-28 rotate-90 flex justify-start items-center w-full gap-2"
						}
					>
						<ThemeColorPicker />
						<Switch
							size="sm"
							checked={!isDark}
							onChange={(e) => {
								setMode(e.currentTarget.checked ? "light" : "dark");
							}}
							onLabel={<IconSun size={16} stroke={2.5} />}
							offLabel={<IconMoonStars size={16} stroke={2.5} />}
							aria-label={
								isDark ? "Switch to light mode" : "Switch to dark mode"
							}
						/>
					</div>
				</SidebarContent>
				<SidebarFooter>
					<NavUser user={user} avatar={avatar} />
				</SidebarFooter>
			</Sidebar>

			{/* This is the second sidebar */}
			{/* We disable collapsible and let it fill remaining space */}
			<Sidebar collapsible="none" className="hidden flex-1 md:flex">
				<SidebarHeader className="gap-3.5 border-b p-4">
					<div className="text-left font-sans flex items-center gap-1">
						<KurrierLogo size={36} />
						<span className="text-lg font-semibold">kurrier</span>
					</div>
					<div className={"-mt-1"}>
						<ComposeMail publicConfig={publicConfig} />
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup className="px-0">
						<SidebarGroupContent>
							<MailboxNav
								mailboxes={mailboxList}
								identityPublicId={identity.publicId}
								onCreateLabel={() => /* open label dialog */ {}}
							/>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	);
}
