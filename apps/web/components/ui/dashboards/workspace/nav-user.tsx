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
import { UserResponse } from "@supabase/supabase-js";
import { Avatar as MantineAvatar } from "@mantine/core";
import { getGravatarUrl, signOut } from "@/lib/actions/auth";
import { useEffect, useState } from "react";

export function NavUser({ user }: { user: UserResponse["data"]["user"] }) {
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
