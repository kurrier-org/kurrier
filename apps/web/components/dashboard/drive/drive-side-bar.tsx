"use client";

import type { DriveState } from "@schema";
import { Cloud, HardDrive } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDashboardPath } from "@/hooks/use-dashboard-path";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

export default function DriveSideBar({
	workspacePublicId,
	onComplete,
}: {
	workspacePublicId: string;
	onComplete?: () => void;
}) {
	const pathName = usePathname();
	const { state } = useDynamicContext<DriveState>();
	const dict = useOptionalDictionary();
	const dashboardPath = useDashboardPath(workspacePublicId);
	const driveBase = dashboardPath("drive");

	const isOnVolumes = pathName.includes("/dashboard/drive/volumes/");
	const isMyDriveActive =
		pathName.endsWith("/dashboard/drive") ||
		(pathName.includes("/dashboard/drive/") && !isOnVolumes);

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel>{dict?.drive?.drive ?? "Drive"}</SidebarGroupLabel>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							tooltip={dict?.drive?.myDrive ?? "My Drive"}
							className={
								"dark:hover:bg-neutral-800 hover:bg-neutral-100 px-2.5 md:px-2 " +
								(isMyDriveActive
									? "text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
									: "")
							}
							onClick={onComplete}
						>
							<Link href={driveBase}>
								<HardDrive />
								<span>{dict?.drive?.myDrive ?? "My Drive"}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>
					{dict?.drive?.cloudVolumes ?? "Cloud volumes"}
				</SidebarGroupLabel>
				<SidebarMenu>
					{state?.cloudVolumes.length === 0 ? (
						<SidebarMenuItem>
							<div className="px-2.5 py-1.5 text-xs leading-5 text-muted-foreground md:px-2">
								{dict?.drive?.noVolumesSidebar ?? "No volumes yet"}
							</div>
						</SidebarMenuItem>
					) : (
						state?.cloudVolumes.map((vol) => {
							const href = `${driveBase}/volumes/${vol.publicId}`;
							const isActive =
								pathName === href || pathName.startsWith(`${href}/`);

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
											<Cloud className="shrink-0" />
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
