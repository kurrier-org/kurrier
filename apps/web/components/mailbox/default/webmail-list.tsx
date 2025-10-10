"use client";
import * as React from "react";
import { MailboxEntity } from "@db";
import { PublicConfig } from "@schema";
import {FetchMailboxThreadsResult, revalidateMailbox} from "@/lib/actions/mailbox";
import MailListHeader from "@/components/mailbox/default/mail-list-header";
import WebmailListItem from "@/components/mailbox/default/webmail-list-item";
import {useEffect} from "react";
import {usePathname, useSearchParams} from "next/navigation";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";


type WebListProps = {
    mailboxThreads: FetchMailboxThreadsResult;
    publicConfig: PublicConfig;
    activeMailbox: MailboxEntity;
    identityPublicId: string;
};

export default function WebmailList({ mailboxThreads, activeMailbox, identityPublicId}: WebListProps) {


    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        const url = `${pathname}?${searchParams.toString()}`
        revalidateMailbox(url)
    }, [pathname, searchParams])



    return (
        <>
            <DynamicContextProvider
                initialState={{ selectedThreadIds: new Set(), activeMailbox, identityPublicId }}
            >
                {mailboxThreads.length === 0 ? (
                    <div className="p-4 text-center text-base text-muted-foreground">
                        No messages in{" "}
                        <span className={"lowercase"}>{activeMailbox.name}</span>
                    </div>
                ) : (
                    <div className="rounded-xl border bg-background/50">
                        <MailListHeader mailboxThreads={mailboxThreads} />

                        <ul role="list" className="divide-y">
                            {mailboxThreads.map((mailboxThreadItem) => (
                                <WebmailListItem key={mailboxThreadItem.threadId+mailboxThreadItem.mailboxId}
                                                 mailboxThreadItem={mailboxThreadItem}
                                                 activeMailbox={activeMailbox}
                                                 identityPublicId={identityPublicId} />
                            ))}
                        </ul>
                    </div>
                )}

            </DynamicContextProvider>

        </>
    );
}
