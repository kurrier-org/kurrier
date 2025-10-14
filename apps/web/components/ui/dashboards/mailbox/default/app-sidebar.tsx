"use client";

import * as React from "react";
import {
	ArchiveX,
	Command,
	File,
	Inbox,
	MailPlus,
	Send,
	Trash2,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { Label } from "@/components/ui/label";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInput,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { IdentityEntity, MailboxEntity } from "@db";
import { MailboxNav } from "@/components/mailbox/default/mailbox-nav";
import { Button } from "@/components/ui/button";
import ComposeMail from "@/components/mailbox/default/compose-mail";
import { PublicConfig } from "@schema";
import KurrierLogo from "@/components/common/kurrier-logo";
// import {Button} from "@mantine/core";

const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	navMain: [],
	mails: [],
};

export function AppSidebar({
	activeMailbox,
	mailboxList,
	identity,
	publicConfig,
	...rest
}: React.ComponentProps<typeof Sidebar> & {
	activeMailbox: MailboxEntity;
	mailboxList: MailboxEntity[];
	identity: IdentityEntity;
	publicConfig: PublicConfig;
}) {
	// Note: I'm using state to show active item.
	// IRL you should use the url/router.

	const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
	const [mails, setMails] = React.useState(data.mails);
	const { setOpen } = useSidebar();

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
								<a href="/">
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<Command className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">Kurrier</span>
										{/*<span className="truncate text-xs">Enterprise</span>*/}
									</div>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent className="px-1.5 md:px-0">
							<SidebarMenu>
								{/*{data.navMain.map((item) => (*/}
								{/*	<SidebarMenuItem key={item.title}>*/}
								{/*		<SidebarMenuButton*/}
								{/*			tooltip={{*/}
								{/*				children: item.title,*/}
								{/*				hidden: false,*/}
								{/*			}}*/}
								{/*			onClick={() => {*/}
								{/*				setActiveItem(item);*/}
								{/*				const mail = data.mails.sort(() => Math.random() - 0.5);*/}
								{/*				setMails(*/}
								{/*					mail.slice(*/}
								{/*						0,*/}
								{/*						Math.max(5, Math.floor(Math.random() * 10) + 1),*/}
								{/*					),*/}
								{/*				);*/}
								{/*				setOpen(true);*/}
								{/*			}}*/}
								{/*			isActive={activeItem?.title === item.title}*/}
								{/*			className="px-2.5 md:px-2"*/}
								{/*		>*/}
								{/*			<item.icon />*/}
								{/*			<span>{item.title}</span>*/}
								{/*		</SidebarMenuButton>*/}
								{/*	</SidebarMenuItem>*/}
								{/*))}*/}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<NavUser user={data.user} />
				</SidebarFooter>
			</Sidebar>

			{/* This is the second sidebar */}
			{/* We disable collapsible and let it fill remaining space */}
			<Sidebar collapsible="none" className="hidden flex-1 md:flex">
				<SidebarHeader className="gap-3.5 border-b p-4">
					<div className="text-left text-brand font-sans flex items-center gap-1">
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
