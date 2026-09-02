import { Suspense } from "react";
import { notFound } from "next/navigation";

import { DISTRIBUTION_PAGES } from "@distribution/pages";

async function DistributionContent({
                                       params,
                                   }: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug = [] } = await params;

    const path = `/${slug.join("/")}`;
    const Page = DISTRIBUTION_PAGES.routes[path];

    if (!Page) {
        notFound();
    }

    return <Page />;
}

export default function DistributionPage({
                                             params,
                                         }: {
    params: Promise<{ slug?: string[] }>;
}) {
    return (
        <Suspense fallback={null}>
            <DistributionContent params={params} />
        </Suspense>
    );
}
