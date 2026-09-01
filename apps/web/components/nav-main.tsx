"use client";

import {
	Blocks,
	ChevronRight,
	FolderSync,
	HardDrive,
	Key,
	LayoutDashboard,
	type LucideIcon,
	Plug,
	Send,
	Vault,
	Webhook,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDictionary } from "@/components/providers/dictionary-provider";
import { useSiteFeatures } from "@/components/providers/site-features-provider";
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
import { useDashboardPath } from "@/hooks/use-dashboard-path";

export function NavMain({
	workspacePublicId,
	workspaceRole,
}: {
	workspacePublicId?: string;
	workspaceRole?: string;
}) {
	const pathname = usePathname();
	const dict = useDictionary();
	const { drive } = useSiteFeatures();
	const dashboardPath = useDashboardPath(workspacePublicId);

	const navPlatformItems: {
		title: string;
		url: string;
		icon: LucideIcon;
		items?: { title: string; url: string }[];
	}[] = [
		{
			title: dict.dashboard.overview,
			url: dashboardPath("platform/overview"),
			icon: LayoutDashboard,
			items: [],
		},
		...(workspaceRole === "owner"
			? [
					{
						title: dict.platform.providers,
						url: dashboardPath("platform/providers"),
						icon: Plug,
						items: [],
					},
					{
						title: dict.platform.identities,
						url: dashboardPath("platform/identities"),
						icon: Send,
						items: [],
					},
				]
			: []),
		...(workspaceRole === "owner"
			? [
					{
						title: dict.platform.workspace,
						url: dashboardPath("platform/workspace"),
						icon: Blocks,
						items: [],
					},
					...(drive
						? [
								{
									title: dict.platform.storage,
									url: dashboardPath("platform/storage"),
									icon: HardDrive,
									items: [],
								},
							]
						: []),
					{
						title: dict.vault.vault,
						url: dashboardPath("platform/vault"),
						icon: Vault,
						items: [],
					},
					{
						title: dict.platform.apiKeys,
						url: dashboardPath("platform/api-keys"),
						icon: Key,
						items: [],
					},
					{
						title: dict.platform.webhooks,
						url: dashboardPath("platform/webhooks"),
						icon: Webhook,
						items: [],
					},
					{
						title: dict.platform.syncServices,
						url: dashboardPath("platform/sync-services"),
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
					const isActive = pathname?.includes(item.url);

					return (
						<Collapsible key={item.title} asChild defaultOpen={isActive}>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									tooltip={item.title}
									isActive={isActive}
									className="h-auto min-h-8 items-start py-1.5 [&>span:last-child]:!overflow-visible [&>span:last-child]:!whitespace-normal [&>span:last-child]:!text-clip"
								>
									<Link href={item.url}>
										<item.icon className="mt-0.5" />
										<span className="min-w-0 break-words leading-5">
											{item.title}
										</span>
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
