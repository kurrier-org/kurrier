import { Suspense } from "react";
import { notFound } from "next/navigation";
import { registerDistribution } from "@distribution";
import { getDashboardPages } from "@extensions";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type SearchParams = Promise<{
    [key: string]: string | string[] | undefined;
}>;

async function ExtensionContent({
                                    params,
                                    searchParams,
                                }: {
    params: Promise<{
        slug: string[];
    }>;
    searchParams: SearchParams;
}) {
    const { slug } = await params;
    const path = slug.join("/");

    const page = getDashboardPages().find(
        (item) => item.path === path,
    );

    if (!page) {
        notFound();
    }

    const Page = page.component as React.ComponentType<{
        searchParams: SearchParams;
    }>;

    const Layout = page.layout as
        | React.ComponentType<{
        children: React.ReactNode;
    }>
        | undefined;

    const content = <Page searchParams={searchParams} />;

    return Layout ? (
        <Layout>{content}</Layout>
    ) : (
        content
    );
}

export default function ExtensionPage({
                                          params,
                                          searchParams,
                                      }: {
    params: Promise<{
        slug: string[];
    }>;
    searchParams: SearchParams;
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
                    <ExtensionContent
                        params={params}
                        searchParams={searchParams}
                    />
                </Suspense>
            </div>
        </>
    );
}
