"use client";

import {
	Blocks,
	ChevronRight,
	CreditCard,
	FolderSync,
	HardDrive,
	Key,
	LayoutDashboard,
	type LucideIcon,
	Plug,
	Send,
	Webhook,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDictionary } from "@/components/providers/dictionary-provider";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
	workspacePublicId,
	workspaceRole,
}: {
	workspacePublicId?: string;
	workspaceRole?: string;
}) {
	const pathname = usePathname();
	const dict = useDictionary();

	const navPlatformItems: {
		title: string;
		url: string;
		icon: LucideIcon;
		items?: { title: string; url: string }[];
	}[] = [
		{
			title: dict.dashboard.overview,
			url: `/w/${workspacePublicId}/dashboard/platform/overview`,
			icon: LayoutDashboard,
			items: [],
		},
		...(workspaceRole === "owner"
			? [
					{
						title: dict.platform.providers,
						url: `/w/${workspacePublicId}/dashboard/platform/providers`,
						icon: Plug,
						items: [],
					},
					{
						title: dict.platform.identities,
						url: `/w/${workspacePublicId}/dashboard/platform/identities`,
						icon: Send,
						items: [],
					},
				]
			: []),
		...(workspaceRole === "owner"
			? [
					{
						title: dict.platform.workspace,
						url: `/w/${workspacePublicId}/dashboard/platform/workspace`,
						icon: Blocks,
						items: [],
					},
					{
						title: dict.platform.storage,
						url: `/w/${workspacePublicId}/dashboard/platform/storage`,
						icon: HardDrive,
						items: [],
					},
					{
						title: dict.platform.apiKeys,
						url: `/w/${workspacePublicId}/dashboard/platform/api-keys`,
						icon: Key,
						items: [],
					},
					{
						title: dict.platform.webhooks,
						url: `/w/${workspacePublicId}/dashboard/platform/webhooks`,
						icon: Webhook,
						items: [],
					},
					{
						title: dict.platform.syncServices,
						url: `/w/${workspacePublicId}/dashboard/platform/sync-services`,
						icon: FolderSync,
						items: [],
					},
				]
			: []),
	];

	return (
		<SidebarGroup>
			<SidebarGroupLabel>{dict.dashboard.navPlatform}</SidebarGroupLabel>
			<SidebarMenu>
				{navPlatformItems.map((item) => {
					const isActive =
						pathname === item.url || pathname?.startsWith(item.url);

					return (
						<Collapsible key={item.title} asChild defaultOpen={isActive}>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									tooltip={item.title}
									isActive={isActive}
								>
									<Link href={item.url}>
										<item.icon />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>

								{item.items?.length ? (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuAction className="data-[state=open]:rotate-90">
												<ChevronRight />
												<span className="sr-only">Toggle</span>
											</SidebarMenuAction>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items.map((subItem) => {
													const isSubActive =
														pathname === subItem.url ||
														pathname?.startsWith(subItem.url);

													return (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton
																asChild
																isActive={isSubActive}
															>
																<Link href={subItem.url}>
																	<span>{subItem.title}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													);
												})}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : null}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
