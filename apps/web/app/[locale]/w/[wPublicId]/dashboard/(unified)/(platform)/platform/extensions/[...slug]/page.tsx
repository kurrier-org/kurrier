import { Suspense } from "react";
import { notFound } from "next/navigation";
import { registerDistribution } from "@distribution";
import { getDashboardPages } from "@extensions";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

async function ExtensionContent({
                                    params,
                                }: {
    params: Promise<{
        slug: string[];
    }>;
}) {
    const { slug } = await params;
    const path = slug.join("/");

    const page = getDashboardPages().find(
        (item) => item.path === path,
    );

    if (!page) {
        notFound();
    }

    const Page = page.component as React.ComponentType;

    return <Page />;
}

export default function ExtensionPage({
                                          params,
                                      }: {
    params: Promise<{
        slug: string[];
    }>;
}) {
    registerDistribution();

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
                <Suspense fallback={null}>
                    <ExtensionContent params={params} />
                </Suspense>
            </div>
        </>
    );
}
