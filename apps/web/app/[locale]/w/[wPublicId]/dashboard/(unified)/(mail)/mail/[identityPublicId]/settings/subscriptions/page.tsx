import React from 'react';
import SectionCard from "@/components/mailbox/settings/settings-section-card";

function Page() {
    return <>
        <SectionCard
            title="Subscriptions"
            description="Subscriptions detected from List-Unsubscribe headers."
        >
            <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                Show a searchable list here (domain/list-id, status, last seen,
                unsubscribe).
            </div>
        </SectionCard>
    </>
}

export default Page;
