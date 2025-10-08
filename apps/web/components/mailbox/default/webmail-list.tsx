"use client";
import * as React from "react";
import { MailboxEntity } from "@db";
import { PublicConfig } from "@schema";
import {FetchWebMailResult, revalidateMailbox} from "@/lib/actions/mailbox";
import MailListHeader from "@/components/mailbox/default/mail-list-header";
import WebmailListItem from "@/components/mailbox/default/webmail-list-item";
import {useEffect} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";


type WebListProps = {
    threads: FetchWebMailResult;
    publicConfig: PublicConfig;
    activeMailbox: MailboxEntity;
    identityPublicId: string;
};

export default function WebmailList({ threads, publicConfig, activeMailbox, identityPublicId}: WebListProps) {


    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        const url = `${pathname}?${searchParams.toString()}`
        revalidateMailbox(url)
    }, [pathname, searchParams])


    return (
        <>
            {threads.length === 0 ? (
                <div className="p-4 text-center text-base text-muted-foreground">
                    No messages in{" "}
                    <span className={"lowercase"}>{activeMailbox.name}</span>
                </div>
            ) : (
                <div className="rounded-xl border bg-background/50 p-1">
                    <MailListHeader />

                    <ul role="list" className="divide-y">
                        {threads.map((threadItem) => (
                            <WebmailListItem key={threadItem.id}
                                             threadItem={threadItem}
                                             activeMailbox={activeMailbox}
                                             identityPublicId={identityPublicId} />
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
