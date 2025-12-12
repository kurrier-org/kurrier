import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function DriveLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <header className="flex items-center gap-2 border-b  bg-background/60 backdrop-blur py-4 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="data-[orientation=vertical]:h-4"
                />
                <h1 className="text-xl font- text-brand dark:text-brand-300">My Drive</h1>
            </header>

            <main>
                <section className="">{children}</section>
            </main>
        </>
    );
}
