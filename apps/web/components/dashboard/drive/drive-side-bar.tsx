"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HardDrive, HardDriveDownload } from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { DriveState } from "@schema";

export default function DriveSideBar({
                                         onComplete,
                                     }: {
    onComplete?: () => void;
}) {
    const pathName = usePathname();
    const searchParams = useSearchParams();
    const { state } = useDynamicContext<DriveState>();

    const volumes = state?.volumes ?? [];

    const selectedVolume = searchParams.get("volume") ?? undefined;
    const defaultVolume = volumes.find((v: any) => v.isDefault);
    const activeVolumeCode =
        selectedVolume || (defaultVolume ? defaultVolume.code : undefined);

    const mainItems = [
        {
            title: "My Drive",
            url: "/dashboard/drive",
            icon: HardDrive,
        },
        {
            title: "Upload",
            url: "/dashboard/drive/upload",
            icon: HardDriveDownload,
        },
    ];

    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>Drive</SidebarGroupLabel>
                <SidebarMenu>
                    {mainItems.map((item) => {
                        const isActive =
                            pathName === item.url && !selectedVolume;

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    className={
                                        "dark:hover:bg-neutral-800 hover:bg-neutral-100 px-2.5 md:px-2 " +
                                        (isActive
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
                        );
                    })}
                </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel>Local volumes</SidebarGroupLabel>
                <SidebarMenu>
                    {volumes.length === 0 ? (
                        <SidebarMenuItem>
                            <div className="text-xs text-muted-foreground px-2.5 md:px-2 py-1.5">
                                No local volumes detected
                            </div>
                        </SidebarMenuItem>
                    ) : (
                        volumes.map((vol: any) => {
                            const isActive = activeVolumeCode === vol.code;
                            const href = `/dashboard/drive/volumes/${vol.publicId}`;
                            const isAvailable = vol.isAvailable ?? true;

                            const baseClasses =
                                "px-2.5 md:px-2 dark:hover:bg-neutral-800 hover:bg-neutral-100";
                            const activeClasses = isActive
                                ? " text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
                                : "";
                            const disabledClasses = !isAvailable
                                ? " opacity-50 cursor-not-allowed"
                                : "";

                            return (
                                <SidebarMenuItem key={vol.id ?? vol.code}>
                                    <SidebarMenuButton
                                        asChild={isAvailable}
                                        tooltip={vol.label ?? vol.code}
                                        className={
                                            baseClasses +
                                            activeClasses +
                                            disabledClasses
                                        }
                                        onClick={isAvailable ? onComplete : undefined}
                                    >
                                        {isAvailable ? (
                                            <Link href={href}>
                                                <HardDrive className="shrink-0" />
                                                <span className="truncate">
                                                    {vol.label ?? vol.code}
                                                    {vol.isDefault ? " (default)" : ""}
                                                </span>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="shrink-0" />
                                                <span className="truncate">
                                                    {vol.label ?? vol.code} (offline)
                                                </span>
                                            </div>
                                        )}
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
