import { Suspense } from "react";
import type React from "react";
import { notFound } from "next/navigation";

import { kurrierWeb } from "@distribution/kurrier-web";

async function ExtensionContent({
                                    params,
                                }: {
    params: Promise<{
        slug: string[];
    }>;
}) {
    const { slug } = await params;
    const path = slug.join("/");

    const page = kurrierWeb.pages.dashboard().find((item) => item.path === path);

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
    return (
        <Suspense fallback={null}>
            <ExtensionContent params={params} />
        </Suspense>
    );
}
