"use client";

import * as React from "react";
import {
    Command, Contact, FolderSync,
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
	FetchLabelsWithCountResult,
	FetchMailboxUnreadCountsResult,
} from "@/lib/actions/mailbox";
import ThemeSwitch from "@/components/common/theme-switch";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { Divider } from "@mantine/core";
import LabelHome from "@/components/dashboard/labels/label-home";
import { IconFrame } from "@tabler/icons-react";
import ContactsNav from "@/components/dashboard/contacts/contacts-sidebar";
import NewContact from "@/components/dashboard/contacts/new-contact";

type UnifiedSidebarProps = React.ComponentProps<typeof Sidebar> & {
	publicConfig: PublicConfig;
	user: UserResponse["data"]["user"];
	avatar: string;
	identityMailboxes: FetchIdentityMailboxListResult;
	unreadCounts: FetchMailboxUnreadCountsResult;
	globalLabels: FetchLabelsWithCountResult;
};

export function AppSidebar({ ...props }: UnifiedSidebarProps) {
	const {
		publicConfig,
		user,
		avatar,
		identityMailboxes,
		unreadCounts,
		globalLabels,
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
                title: "Contacts",
                url: "/dashboard/contacts",
                icon: Contact,
                isActive: true,
            },
			{
				title: "Platform",
				url: "/dashboard/platform/overview",
				icon: IconFrame,
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
                title: "Sync Services",
                url: "/dashboard/platform/sync-services",
                icon: FolderSync,
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

    const pathName = usePathname();
    const isOnMail = pathName?.includes("/mail");
    const isOnPlatform = pathName?.includes("/platform");
    const isOnContacts = pathName?.includes("/contacts");

    type SidebarSection = "mail" | "contacts" | "platform";

    const section: SidebarSection = isOnPlatform
        ? "platform"
        : isOnContacts
            ? "contacts"
            : "mail";

    const [activeItem, setActiveItem] = React.useState(() => {
        if (section === "platform") {
            return data.navMain.find((i) => i.url.includes("/platform")) ?? data.navMain[0];
        }
        if (section === "contacts") {
            return data.navMain.find((i) => i.url.includes("/contacts")) ?? data.navMain[0];
        }
        return data.navMain.find((i) => i.url.includes("/mail")) ?? data.navMain[0];
    });

    React.useEffect(() => {
        if (section === "platform") {
            setActiveItem(
                data.navMain.find((i) => i.url.includes("/platform")) ?? data.navMain[0],
            );
        } else if (section === "contacts") {
            setActiveItem(
                data.navMain.find((i) => i.url.includes("/contacts")) ?? data.navMain[0],
            );
        } else {
            setActiveItem(
                data.navMain.find((i) => i.url.includes("/mail")) ?? data.navMain[0],
            );
        }
    }, [section, pathName, data.navMain]);

	const { setOpen, toggleSidebar } = useSidebar();

	const router = useRouter();


    const desktopSectionContent: Record<SidebarSection, React.ReactNode> = {
        mail: (
            <>
                <IdentityMailboxesList
                    identityMailboxes={identityMailboxes}
                    unreadCounts={unreadCounts}
                />
                <LabelHome globalLabels={globalLabels} />
            </>
        ),
        contacts: <ContactsNav labels={[]} />,
        platform: <NavMain items={data.navPlatform} />,
    };

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
											className={"px-2.5 md:px-2"}
										>
											<item.icon className={item.title === activeItem?.title ? "text-brand dark:text-white" : ""} />
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}

								{isMobile ? (
									<>
										<Divider variant={"dashed"} my={"xl"} />
                                        {desktopSectionContent[section]}
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
					{isOnMail && (
						<div className={"-mt-1"}>
							<ComposeMail publicConfig={publicConfig} />
						</div>
					)}
                    {isOnContacts && (
                        <div className={"-mt-1"}>
                            <NewContact publicConfig={publicConfig} />
                        </div>
                    )}
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup className="px-0">
						<SidebarGroupContent>
                            {desktopSectionContent[section]}
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	);
}
