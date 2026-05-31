import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import MailboxSearch from "@/components/mailbox/default/mailbox-search";
import IdentitySettingsLink from "@/components/mailbox/settings/identity-settings";
import {getWorkspacePublicId, rlsClient} from "@/lib/actions/clients";
import { identities } from "@db";
import { eq } from "drizzle-orm";

async function MailboxSearchHeader({params}: {params: Promise<Record<string, string>>}) {
    const { identityPublicId, mailboxSlug } = await params;
    const workspacePublicId = await getWorkspacePublicId()

    const rls = await rlsClient();
    const [identity] = await rls((tx) =>
        tx
            .select({
                value: identities.value,
            })
            .from(identities)
            .where(eq(identities.publicId, identityPublicId))
    );

    const identityLabel = identity?.value;

    return <header className={"bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 z-50"}>
        <SidebarTrigger className="-ml-1" />
        <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
        />
        <MailboxSearch
            publicId={identityPublicId}
            mailboxSlug={mailboxSlug}
            workspacePublicId={workspacePublicId}
        />
        <IdentitySettingsLink identityLabel={identityLabel} workspacePublicId={workspacePublicId} />
    </header>
}

export default MailboxSearchHeader;
