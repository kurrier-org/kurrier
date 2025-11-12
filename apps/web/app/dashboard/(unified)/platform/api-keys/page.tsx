import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";
import ManageApiKeys from "@/components/dashboard/api-keys/manage-api-keys";
import { fetchUserAPIKeys } from "@/lib/actions/dashboard";

export default async function Page() {
	const apiKeysList = await fetchUserAPIKeys();

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
				<ManageApiKeys apiKeysList={apiKeysList} />
			</div>
		</>
	);
}

// /api/send
// /api/messages
// /api/templates
// /api/providers
// /api/identities
// /api/webhooks
