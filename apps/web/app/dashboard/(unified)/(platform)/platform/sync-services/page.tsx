import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { fetchUserDavAccounts } from "@/lib/actions/dashboard";
import SyncServicesHome from "@/components/dashboard/sync-services/sync-services-home";
import { getPublicEnv } from "@schema";

export default async function Page() {
	const { WEB_URL } = getPublicEnv();
	const account = await fetchUserDavAccounts();
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
					username={account.username ?? ""}
					password={account.vault ?? ""}
				/>
			</div>
		</>
	);
}
