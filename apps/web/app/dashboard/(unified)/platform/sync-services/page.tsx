import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { getOrCreateDavPassword } from "@/lib/actions/dashboard";
import SyncServicesHome from "@/components/dashboard/sync-services/sync-services-home";
import { getPublicEnv } from "@schema";

export default async function Page() {
	const result = await getOrCreateDavPassword();

	let username = "";
	let password = "";

	if (result.status === "exists") {
		username = result.username;
	}

	if (result.status === "created" || result.status === "updated") {
		username = result.username;
		password = result.password;
	}

	const { WEB_URL } = getPublicEnv();

	const safeUsername = username ?? "";
	const safePassword = password ?? "";

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
				</div>
			</header>
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<SyncServicesHome
					baseDavUrl={WEB_URL}
					username={safeUsername}
					password={safePassword}
				/>
			</div>
		</>
	);
}
