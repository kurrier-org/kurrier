import { Suspense } from "react";
import type React from "react";
import { notFound } from "next/navigation";

import { kurrierWeb } from "@distribution/kurrier-web";

async function DistributionContent({
                                       params,
                                   }: {
    params: Promise<{
        slug?: string[];
    }>;
}) {
    const { slug = [] } = await params;

    const path = slug.length > 0
        ? `/${slug.join("/")}`
        : "/";

    const pages = kurrierWeb.pages.distribution();

    const Page = pages.routes?.[path] as
        | React.ComponentType
        | undefined;

    if (!Page) {
        notFound();
    }

    return <Page />;
}

export default function DistributionPage({
                                             params,
                                         }: {
    params: Promise<{
        slug?: string[];
    }>;
}) {
    return (
        <Suspense fallback={null}>
            <DistributionContent params={params} />
        </Suspense>
    );
}
