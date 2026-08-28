import { connection } from "next/server";
import type React from "react";
import { Suspense } from "react";
import Loading from "@/app/loading";
import DriveTopBar from "@/components/dashboard/drive/drive-top-bar";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { normalizeWithinPath } from "@/lib/actions/drive";

async function DriveHeader({
	params,
}: {
	params: Promise<{
		segments?: string[];
	}>;
}) {
	await connection();

	const { segments } = await params;

	const [ctx, user, workspacePublicId] = await Promise.all([
		normalizeWithinPath(segments ?? []),
		isSignedIn(),
		getWorkspacePublicId(),
	]);

	return (
		<header className="flex h-16 min-w-0 shrink-0 items-center gap-2 border-b bg-background/60 px-3 backdrop-blur sm:px-4">
			<SidebarTrigger className="-ml-1" />

			<Separator
				orientation="vertical"
				className="data-[orientation=vertical]:h-4"
			/>

			<DriveTopBar
				ctx={ctx}
				userId={String(user?.id)}
				workspacePublicId={workspacePublicId}
			/>

			<NewUploadButton compact className="ml-auto shrink-0 md:hidden" />
		</header>
	);
}

export default function DriveSegmentsLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{
		segments?: string[];
	}>;
}) {
	return (
		<>
			<Suspense fallback={<Loading />}>
				<DriveHeader params={params} />
			</Suspense>

			<main className="flex min-h-0 flex-1 flex-col">
				<section className="flex min-h-0 flex-1 flex-col">{children}</section>
			</main>
		</>
	);
}
