"use client";

import * as React from "react";
import {
	Command,
	File,
	Inbox,
	Key,
	LayoutDashboard,
	Plug,
	Send,
} from "lucide-react";

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
import { usePathname, useRouter } from "next/navigation";
import KurrierLogo from "@/components/common/kurrier-logo";
import ComposeMail from "@/components/mailbox/default/compose-mail";
import { PublicConfig } from "@schema";
import { UserResponse } from "@supabase/supabase-js";
import { NavMain } from "@/components/ui/dashboards/workspace/nav-main";
import ThemeColorPicker from "@/components/common/theme-color-picker";
import IdentityMailboxesList from "@/components/dashboard/identity-mailboxes-list";
import {
	FetchIdentityMailboxListResult,
	FetchMailboxUnreadCountsResult,
} from "@/lib/actions/mailbox";
import ThemeSwitch from "@/components/common/theme-switch";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { Divider } from "@mantine/core";

type UnifiedSidebarProps = React.ComponentProps<typeof Sidebar> & {
	publicConfig: PublicConfig;
	user: UserResponse["data"]["user"];
	avatar: string;
	identityMailboxes: FetchIdentityMailboxListResult;
	unreadCounts: FetchMailboxUnreadCountsResult;
};

export function AppSidebar({ ...props }: UnifiedSidebarProps) {
	const {
		publicConfig,
		user,
		avatar,
		identityMailboxes,
		unreadCounts,
		...restProps
	} = props;

	const isMobile = useMediaQuery("(max-width: 768px)");

	const allMailUrl =
		identityMailboxes.length > 0
			? `/dashboard/mail/${identityMailboxes[0].identity.publicId}/inbox`
			: `/dashboard/mail`;

	const data = {
		navMain: [
			{
				title: "All Mail",
				url: allMailUrl,
				icon: Inbox,
				isActive: true,
			},
			{
				title: "Platform",
				url: "/dashboard/platform/overview",
				icon: File,
				isActive: false,
			},
		],
		navPlatform: [
			{
				title: "Overview",
				url: "/dashboard/platform/overview",
				icon: LayoutDashboard,
				items: [],
			},
			{
				title: "Providers",
				url: "/dashboard/platform/providers",
				icon: Plug,
				items: [],
			},
			{
				title: "Identities",
				url: "/dashboard/platform/identities",
				icon: Send,
				items: [],
			},
			{
				title: "API Keys",
				url: "/dashboard/platform/api-keys",
				icon: Key,
				items: [],
			},
		],
	};

	// Note: I'm using state to show active item.
	// IRL you should use the url/router.
	const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
	// const [mails, setMails] = React.useState(data.mails);
	const { setOpen, toggleSidebar } = useSidebar();

	const router = useRouter();
	const pathName = usePathname();
	const isOnPlatform = pathName?.includes("/platform");

	return (
		<Sidebar
			collapsible="icon"
			className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
			{...restProps}
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
								<Link href={"/dashboard/platform/overview"}>
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<Command className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">Kurrier</span>
									</div>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent className={"relative"}>
					<SidebarGroup className={"mt-8"}>
						<SidebarGroupContent className="px-1.5 md:px-0">
							<SidebarMenu>
								{data.navMain.map((item) => (
									<SidebarMenuItem
										key={item.title}
										onClick={() => {
											if (isMobile) {
												toggleSidebar();
											}
										}}
									>
										<SidebarMenuButton
											tooltip={{
												children: item.title,
												hidden: false,
											}}
											onClick={() => {
												setActiveItem(item);
												setOpen(true);
												router.push(item.url);
											}}
											isActive={activeItem?.title === item.title}
											className="px-2.5 md:px-2"
										>
											<item.icon />
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}

								{isMobile ? (
									<>
										<Divider variant={"dashed"} my={"xl"} />
										{isOnPlatform ? (
											<NavMain
												items={data.navPlatform}
												onComplete={() => {
													if (isMobile) {
														toggleSidebar();
													}
												}}
											/>
										) : (
											<IdentityMailboxesList
												identityMailboxes={identityMailboxes}
												unreadCounts={unreadCounts}
												onComplete={() => {
													if (isMobile) {
														toggleSidebar();
													}
												}}
											/>
										)}
									</>
								) : (
									<hr className="my-2 border-border" />
								)}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<div
						className={
							isMobile
								? "absolute top-0 mx-4 flex gap-2 justify-center items-center"
								: "absolute bottom-28 rotate-90 flex justify-start items-center w-full gap-2"
						}
					>
						<ThemeColorPicker
							onComplete={() => {
								isMobile && toggleSidebar();
							}}
						/>
						<ThemeSwitch
							onComplete={() => {
								isMobile && toggleSidebar();
							}}
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
					{!isOnPlatform && (
						<div className={"-mt-1"}>
							<ComposeMail publicConfig={publicConfig} />
						</div>
					)}
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup className="px-0">
						<SidebarGroupContent>
							{isOnPlatform ? (
								<NavMain items={data.navPlatform} />
							) : (
								<IdentityMailboxesList
									identityMailboxes={identityMailboxes}
									unreadCounts={unreadCounts}
								/>
							)}
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	);
}
