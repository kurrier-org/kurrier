"use client";
import * as React from "react";
import { MailboxEntity } from "@db";
import { useEffect } from "react";
import { PublicConfig } from "@schema";
import {
    deltaFetch, FetchWebMailResult
} from "@/lib/actions/mailbox";
import MailListHeader from "@/components/mailbox/default/mail-list-header";
import WebmailListItem from "@/components/mailbox/webmail-list-item";


type WebListProps = {
    threads: FetchWebMailResult;
    publicConfig: PublicConfig;
    activeMailbox: MailboxEntity;
    identityPublicId: string;
};

export default function WebmailList({ threads, publicConfig, activeMailbox, identityPublicId}: WebListProps) {


    useEffect(() => {
        deltaFetch({identityId: activeMailbox.identityId})
    }, []);


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
                            <WebmailListItem key={threadItem.id} threadItem={threadItem} activeMailbox={activeMailbox} identityPublicId={identityPublicId} />
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
