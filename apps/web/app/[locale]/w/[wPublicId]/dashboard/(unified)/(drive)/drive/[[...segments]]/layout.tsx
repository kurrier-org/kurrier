import React, { Suspense } from "react";
import { connection } from "next/server";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import DriveTopBar from "@/components/dashboard/drive/drive-top-bar";
import { normalizeWithinPath } from "@/lib/actions/drive";
import { isSignedIn } from "@/lib/actions/auth";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import Loading from "@/app/loading";

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
        <header className="flex items-center gap-2 border-b bg-background/60 backdrop-blur py-4 px-4">
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

            <main>
                <section>{children}</section>
            </main>
        </>
    );
}
