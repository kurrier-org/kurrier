"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UploadCloud, Tag } from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

type ContactLabel = {
    id: string;
    name: string;
    slug: string;
    contactsCount: number;
};

export default function ContactsNav({
                                labels,
                                onComplete,
                            }: {
    labels: ContactLabel[];
    onComplete?: () => void;
}) {
    const pathname = usePathname();

    const mainItems = [
        {
            title: "All contacts",
            url: "/dashboard/contacts",
            icon: Users,
        },
        {
            title: "Import",
            url: "/dashboard/contacts/import",
            icon: UploadCloud,
        },
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
                                    (pathname === item.url ? "bg-neutral-200 dark:bg-neutral-800" : "")
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

            <SidebarGroup>
                <SidebarGroupLabel>Labels</SidebarGroupLabel>
                <SidebarMenu>
                    {labels.length === 0 ? (
                        <SidebarMenuItem>
                            <div className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                                No labels yet
                            </div>
                        </SidebarMenuItem>
                    ) : (
                        labels.map((label) => {
                            const url = `/dashboard/contacts/labels/${label.slug}`;
                            const isActive = pathname === url;
                            return (
                                <SidebarMenuItem key={label.id}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={label.name}
                                        className={
                                            "dark:hover:bg-neutral-800 hover:bg-neutral-100 px-2.5 md:px-2 " +
                                            (isActive ? "bg-neutral-200 dark:bg-neutral-800" : "")
                                        }
                                        onClick={onComplete}
                                    >
                                        <Link href={url}>
                                            <Tag className="h-3.5 w-3.5" />
                                            <span className="flex-1 truncate">{label.name}</span>
                                            {label.contactsCount > 0 && (
                                                <span className="text-xs text-sidebar-foreground/70">
                          {label.contactsCount}
                        </span>
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })
                    )}
                </SidebarMenu>
            </SidebarGroup>
        </>
    );
}
