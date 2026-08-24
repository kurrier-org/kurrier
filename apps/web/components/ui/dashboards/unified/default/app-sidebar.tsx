"use client";

import { Divider } from "@mantine/core";
import { IconFrame } from "@tabler/icons-react";
import { Calendar, Contact, HardDrive, Inbox, MailOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import KurrierLogo from "@/components/common/kurrier-logo";
import ThemeColorPicker from "@/components/common/theme-color-picker";
import ThemeSwitch from "@/components/common/theme-switch";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useSiteFeatures } from "@/components/providers/site-features-provider";
import { Button } from "@/components/ui/button";
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

type UnifiedSidebarProps = React.ComponentProps<typeof Sidebar> & {
	navUserContent: React.ReactNode;
	sidebarSectionContent?: React.ReactNode;
	sidebarTopContent?: React.ReactNode;
	workspacePublicId?: string;
};

export function AppSidebar({ ...props }: UnifiedSidebarProps) {
	const { drive } = useSiteFeatures();
	const {
		sidebarSectionContent,
		sidebarTopContent,
		workspacePublicId,
		navUserContent,
		...restProps
	} = props;
	const { isMobile, setOpen, setOpenMobile, toggleSidebar } = useSidebar();
	const dict = useOptionalDictionary();

	const data = {
		navMain: [
			{
				title: dict?.dashboard?.navMail ?? "All Mail",
				url: `/w/${workspacePublicId}/dashboard/mail`,
				icon: Inbox,
				isActive: true,
			},
			{
				title: dict?.dashboard?.navContacts ?? "Contacts",
				url: `/w/${workspacePublicId}/dashboard/contacts`,
				icon: Contact,
				isActive: true,
			},
			{
				title: dict?.dashboard?.navCalendar ?? "Calendar",
				url: `/w/${workspacePublicId}/dashboard/calendar`,
				icon: Calendar,
				isActive: true,
			},
			...(drive
				? [
						{
							title: dict?.dashboard?.navDrive ?? "Drive",
							url: `/w/${workspacePublicId}/dashboard/drive`,
							icon: HardDrive,
							isActive: true,
						},
					]
				: []),
			{
				title: dict?.dashboard?.navPlatform ?? "Platform",
				url: `/w/${workspacePublicId}/dashboard/platform/overview`,
				icon: IconFrame,
				isActive: false,
			},
		],
	};

	const pathName = usePathname();
	const isOnPlatform = pathName?.includes("/platform");
	const isOnContacts = pathName?.includes("/contacts");
	const isOnCalendar = pathName?.includes("/calendar");
	const isOnDrive = pathName?.includes("/drive");

	type SidebarSection = "mail" | "contacts" | "platform" | "calendar" | "drive";

	const section: SidebarSection = isOnPlatform
		? "platform"
		: isOnContacts
			? "contacts"
			: isOnCalendar
				? "calendar"
				: isOnDrive
					? "drive"
					: "mail";

	const [activeItem, setActiveItem] = React.useState(() => {
		if (section === "platform") {
			return (
				data.navMain.find((i) => i.url.includes("/platform")) ?? data.navMain[0]
			);
		}
		if (section === "contacts") {
			return (
				data.navMain.find((i) => i.url.includes("/contacts")) ?? data.navMain[0]
			);
		}
		if (section === "calendar") {
			return (
				data.navMain.find((i) => i.url.includes("/calendar")) ?? data.navMain[0]
			);
		}
		if (section === "drive") {
			return (
				data.navMain.find((i) => i.url.includes("/drive")) ?? data.navMain[0]
			);
		}
		return data.navMain.find((i) => i.url.includes("/mail")) ?? data.navMain[0];
	});

	React.useEffect(() => {
		if (isMobile && pathName) {
			setOpenMobile(false);
		}
	}, [isMobile, pathName, setOpenMobile]);

	React.useEffect(() => {
		if (section === "platform") {
			setActiveItem(
				data.navMain.find((i) => i.url.includes("/platform")) ??
					data.navMain[0],
			);
		} else if (section === "calendar") {
			setActiveItem(
				data.navMain.find((i) => i.url.includes("/calendar")) ??
					data.navMain[0],
			);
		} else if (section === "contacts") {
			setActiveItem(
				data.navMain.find((i) => i.url.includes("/contacts")) ??
					data.navMain[0],
			);
		} else if (section === "drive") {
			setActiveItem(
				data.navMain.find((i) => i.url.includes("/drive")) ?? data.navMain[0],
			);
		} else {
			setActiveItem(
				data.navMain.find((i) => i.url.includes("/mail")) ?? data.navMain[0],
			);
		}
	}, [section, data.navMain]);

	const router = useRouter();

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
				className="w-full! border-r md:w-[calc(var(--sidebar-width-icon)+1px)]!"
			>
				<SidebarHeader className="border-b md:border-b-0">
					<div className="flex items-center justify-between px-1 py-1 md:hidden">
						<Link
							href={`/w/${workspacePublicId}/dashboard/mail`}
							className="flex items-center gap-2"
						>
							<KurrierLogo size={30} />
							<span className="text-base font-semibold">kurrier</span>
						</Link>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setOpenMobile(false)}
							aria-label="Close navigation"
						>
							<X className="size-5" />
						</Button>
					</div>

					<SidebarMenu className="hidden md:flex">
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
								<Link
									href={`/w/${workspacePublicId}/dashboard/platform/overview`}
								>
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<MailOpen className="size-4" />
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
					<SidebarGroup className="mt-2 md:mt-8">
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
											className={"px-2.5 md:px-2"}
										>
											<item.icon
												className={
													item.title === activeItem?.title
														? "text-brand dark:text-white"
														: ""
												}
											/>
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}

								{!isMobile && <hr className="my-2 border-border" />}
							</SidebarMenu>
							{isMobile && (
								<div className="mt-2">
									<Divider variant="dashed" my="lg" />
									{sidebarSectionContent}
								</div>
							)}
						</SidebarGroupContent>
					</SidebarGroup>
					<div
						className={
							isMobile
								? "mt-auto flex items-center justify-center gap-3 border-t px-4 py-3"
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
				<SidebarFooter className="border-t md:border-t-0">
					{navUserContent}
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
					{sidebarTopContent}
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup className="px-0">
						<SidebarGroupContent>{sidebarSectionContent}</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	);
}
