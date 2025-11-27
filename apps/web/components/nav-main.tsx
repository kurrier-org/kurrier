"use client";

import {
    ChevronRight,
    FolderSync,
    Key,
    LayoutDashboard,
    type LucideIcon,
    Plug,
    Send,
} from "lucide-react";

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
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavMain() {
    const pathname = usePathname();

    const navPlatformItems: {
        title: string;
        url: string;
        icon: LucideIcon;
        items?: { title: string; url: string }[];
    }[] = [
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
    ];

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {navPlatformItems.map((item) => {
                    const isActive =
                        pathname === item.url || pathname?.startsWith(item.url);

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={isActive}
                        >
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
