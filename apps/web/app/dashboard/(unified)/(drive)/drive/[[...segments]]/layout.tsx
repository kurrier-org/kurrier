import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import DriveTopBar from "@/components/dashboard/drive/drive-top-bar";
import { normalizeWithinPath } from "@/lib/actions/drive";
import { isSignedIn } from "@/lib/actions/auth";

export default async function DriveSegmentsLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Record<any, any>;
}) {
	const { segments } = await params;
	const ctx = await normalizeWithinPath(segments ?? []);
	const user = await isSignedIn();

	return (
		<>
			<header className="flex items-center gap-2 border-b  bg-background/60 backdrop-blur py-4 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="data-[orientation=vertical]:h-4"
				/>
				<DriveTopBar ctx={ctx} userId={String(user?.id)} />
			</header>

			<main>
				<section className="">{children}</section>
			</main>
		</>
	);
}
