import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";
import {fetchUserAPIKeys, fetchUserWebhooks} from "@/lib/actions/dashboard";
import ManageWebhooks from "@/components/dashboard/webhooks/manage-webhooks";
import {fetchIdentityMailboxList} from "@/lib/actions/mailbox";

export default async function Page() {
    const apiKeysList = await fetchUserAPIKeys();
    const webhooksList = await fetchUserWebhooks();
    const identityMailboxes = await fetchIdentityMailboxList()

    const identitiesOptions = identityMailboxes.map((im) => ({
        label: `${im.identity.displayName} <${im.identity.value}>`,
        value: im.identity.id,
    }));


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
                <ManageWebhooks apiKeysList={apiKeysList}
                                hooksList={webhooksList}
                                identitiesOptions={identitiesOptions} />
            </div>
        </>
    );
}
