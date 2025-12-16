"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardDrive } from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { DriveState } from "@schema";

export default function DriveSideBar({ onComplete }: { onComplete?: () => void }) {
    const pathName = usePathname();
    const { state } = useDynamicContext<DriveState>();

    const isOnVolumes = pathName.startsWith("/dashboard/drive/volumes/");
    const isMyDriveActive =
        pathName === "/dashboard/drive" || (pathName.startsWith("/dashboard/drive/") && !isOnVolumes);

    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>Drive</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            tooltip="My Drive"
                            className={
                                "dark:hover:bg-neutral-800 hover:bg-neutral-100 px-2.5 md:px-2 " +
                                (isMyDriveActive
                                    ? "text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
                                    : "")
                            }
                            onClick={onComplete}
                        >
                            <Link href="/dashboard/drive">
                                <HardDrive />
                                <span>My Drive</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel>Cloud volumes</SidebarGroupLabel>
                <SidebarMenu>
                    {state?.cloudVolumes.length === 0 ? (
                        <SidebarMenuItem>
                            <div className="text-xs text-muted-foreground px-2.5 md:px-2 py-1.5">
                                No cloud volumes detected
                            </div>
                        </SidebarMenuItem>
                    ) : (
                        state?.cloudVolumes.map((vol: any) => {
                            const href = `/dashboard/drive/volumes/${vol.publicId}`;
                            const isActive = pathName === href || pathName.startsWith(href + "/");

                            return (
                                <SidebarMenuItem key={vol.id ?? vol.code}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={vol.label ?? vol.code}
                                        className={
                                            "px-2.5 md:px-2 dark:hover:bg-neutral-800 hover:bg-neutral-100" +
                                            (isActive
                                                ? " text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
                                                : "")
                                        }
                                        onClick={onComplete}
                                    >
                                        <Link href={href}>
                                            <HardDrive className="shrink-0" />
                                            <span className="truncate">{vol.label ?? vol.code}</span>
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
