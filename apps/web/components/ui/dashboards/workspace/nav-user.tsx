"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Avatar as MantineAvatar } from "@mantine/core";
import {FetchIsSignedInResult, getGravatarUrl, signOut} from "@/lib/actions/auth";
import { useEffect, useState } from "react";
import {FetchWorkspacesResult, switchWorkSpace} from "@/lib/actions/workspace";

export function NavUser({ workspacePublicId, user, userWorkspaces }: { workspacePublicId: string | undefined, user: FetchIsSignedInResult, userWorkspaces: FetchWorkspacesResult }) {
	const { isMobile } = useSidebar();
	const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);

	const fetchGravatar = async () => {
		const avatar = await getGravatarUrl(String(user?.email));
		setGravatarUrl(avatar);
	};

	useEffect(() => {
		if (user) {
			fetchGravatar();
		}
	}, [user]);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								{gravatarUrl && (
									<AvatarImage src={gravatarUrl} alt={user?.email} />
								)}
								<AvatarFallback className="rounded-lg">K</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user?.email}</span>
								<span className="truncate text-xs">{user?.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									{gravatarUrl && (
										<AvatarImage src={gravatarUrl} alt={user?.email} />
									)}
									<MantineAvatar name={user?.email} color="initials" />
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user?.email}</span>
									<span className="truncate text-xs">{user?.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="p-0 font-normal">
							<ul className="max-h-40 overflow-y-auto rounded-md bg-white p-1 dark:bg-neutral-900">
								{userWorkspaces.map((userWorkspace) => {
									const isSelected =
										userWorkspace.workspaces.publicId === workspacePublicId;

									return (
										<li
											key={userWorkspace.workspaces.id}
											onClick={() => switchWorkSpace(userWorkspace.workspaces.publicId, userWorkspace.workspaces.id)}
											className={`
          cursor-pointer rounded-md px-3 py-2 text-sm
          transition-colors
          ${
												isSelected
													? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
													: "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
											}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        `}
										>
											<div className="truncate font-medium">
												{userWorkspace.workspaces.name}
											</div>
										</li>
									);
								})}
							</ul>

						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => signOut()}
							className={"cursor-pointer"}
						>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
