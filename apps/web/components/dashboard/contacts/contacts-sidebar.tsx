"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UploadCloud, Plus } from "lucide-react";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function ContactsNav({
	onComplete,
}: {
	onComplete?: () => void;
}) {
	const pathName = usePathname();

	const mainItems = [
		{
			title: "New Contact",
			url: "/dashboard/contacts/new",
			icon: Plus,
		},
		{
			title: "All contacts",
			url: "/dashboard/contacts",
			icon: Users,
		},
		// {
		// 	title: "Import",
		// 	url: "/dashboard/contacts/import",
		// 	icon: UploadCloud,
		// },
	];

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel>Contacts</SidebarGroupLabel>
				<SidebarMenu>
					{mainItems.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								tooltip={item.title}
								className={
									"dark:hover:bg-neutral-800 hover:bg-neutral-100 px-2.5 md:px-2 " +
									(pathName === item.url
										? "text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
										: "")
								}
								onClick={onComplete}
							>
								<Link href={item.url}>
									<item.icon />
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroup>
		</>
	);
}
