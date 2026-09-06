import { Suspense } from "react";
import type React from "react";
import { notFound } from "next/navigation";

import { kurrierWeb } from "@distribution/kurrier-web";

type PageProps = {
    params: Promise<{
        slug?: string[];
    }>;
    searchParams: Promise<
        Record<string, string | string[] | undefined>
    >;
};

async function ExtensionContent({
                                    params,
                                    searchParams,
                                }: PageProps) {
    const { slug = [] } = await params;

    const page = kurrierWeb.pages.auth().find((item) => {
        const pagePath = item.path.split("/");

        if (pagePath.length > slug.length) {
            return false;
        }

        return pagePath.every(
            (segment, index) => segment === slug[index],
        );
    });

    if (!page) {
        notFound();
    }

    const pagePath = page.path.split("/");
    const extensionSlug = slug.slice(pagePath.length);

    const extensionProps: PageProps = {
        params: Promise.resolve({
            slug: extensionSlug,
        }),
        searchParams,
    };

    const Page = page.component as React.ComponentType<PageProps>;

    if (page.layout) {
        const Layout = page.layout as React.ComponentType<{
            children: React.ReactNode;
        }>;

        return (
            <Layout>
                <Page {...extensionProps} />
            </Layout>
        );
    }

    return <Page {...extensionProps} />;
}

export default function ExtensionPage(props: PageProps) {
    return (
        <Suspense fallback={null}>
            <ExtensionContent {...props} />
        </Suspense>
    );
}
