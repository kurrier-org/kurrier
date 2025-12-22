import React, { ReactNode } from "react";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";
import {Mail} from "lucide-react";
import SettingsTabs from "@/components/mailbox/settings/settings-tabs";
import { Container } from "@/components/common/containers";
import { rlsClient } from "@/lib/actions/clients";
import { identities } from "@db";
import { eq } from "drizzle-orm";

type LayoutProps = {
	children: ReactNode;
	params: Promise<Record<string, string>>;
};



export default async function Layout({
	children,
	params,
}: LayoutProps) {

    const paramsResolved = await params;
    const rls = await rlsClient();
    const [identity] = await rls((tx) =>
        tx
            .select()
            .from(identities)
            .where(eq(identities.publicId, paramsResolved.identityPublicId))
    );

    const identityLabel = identity?.value;


    return <>
        <MailboxSearchHeader params={params} />

        <Container variant="wide" className="my-10">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Settings
                </h1>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Identity settings for this mailbox
                </p>
            </div>

            <div className={"grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]"}>
                <div className={"rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"}>
                    <div className={"px-3 pb-3 pt-2"}>
                        <div className={"flex items-center gap-3"}>
                            <div className={"flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand/50 text-brand dark:text-brand-foreground"}>
                                <Mail size={18} />
                            </div>
                            <div className={"min-w-0"}>
                                <div className={"truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50"}>
                                    {identityLabel}
                                </div>
                                <div className={"truncate text-xs text-neutral-600 dark:text-neutral-400"}>
                                    Identity
                                </div>
                            </div>
                        </div>
                    </div>

                    <SettingsTabs />
                </div>


                <div className="space-y-6">
                    {children}
                </div>

            </div>
        </Container>

    </>
}
