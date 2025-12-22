import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import MailboxSearch from "@/components/mailbox/default/mailbox-search";
import { isSignedIn } from "@/lib/actions/auth";
import IdentitySettingsLink from "@/components/mailbox/settings/identity-settings";
import { rlsClient } from "@/lib/actions/clients";
import { identities } from "@db";
import { eq } from "drizzle-orm";

async function MailboxSearchHeader({params}: {params: Promise<Record<string, string>>}) {
    const { identityPublicId, mailboxSlug } = await params;
    const user = await isSignedIn();

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
            user={user}
            publicId={identityPublicId}
            mailboxSlug={mailboxSlug}
        />
        <IdentitySettingsLink identityLabel={identityLabel} />
    </header>
}

export default MailboxSearchHeader;
