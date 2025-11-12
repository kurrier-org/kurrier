"use client";
import * as React from "react";
import { MailboxEntity, MailboxSyncEntity } from "@db";
import { PublicConfig } from "@schema";
import {
	FetchIdentityMailboxListResult,
	FetchMailboxThreadsResult,
} from "@/lib/actions/mailbox";
import MailListHeader from "@/components/mailbox/default/mail-list-header";
import WebmailListItem from "@/components/mailbox/default/webmail-list-item";
import { useEffect } from "react";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { toast } from "sonner";
import { useMediaQuery } from "@mantine/hooks";
import WebmailListItemMobile from "@/components/mailbox/default/webmail-list-item-mobile";

type WebListProps = {
	mailboxThreads: FetchMailboxThreadsResult;
	publicConfig: PublicConfig;
	activeMailbox: MailboxEntity;
	identityPublicId: string;
	identityMailboxes: FetchIdentityMailboxListResult;
	mailboxSync?: MailboxSyncEntity;
};

export default function WebmailList({
	mailboxThreads,
	activeMailbox,
	identityPublicId,
	mailboxSync,
	publicConfig,
	identityMailboxes,
}: WebListProps) {
	useEffect(() => {
		if (mailboxSync) {
			if (mailboxSync?.phase !== "IDLE") {
				toast.info("Mailbox Busy", {
					description: "Mailbox is currently syncing",
				});
			}
		}
	}, [mailboxSync, mailboxSync?.phase]);

	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<>
			<DynamicContextProvider
				initialState={{
					selectedThreadIds: new Set(),
					activeMailbox,
					identityPublicId,
				}}
			>
				{mailboxThreads.length === 0 ? (
					<div className="p-4 text-center text-base text-muted-foreground">
						No messages in{" "}
						<span className={"lowercase"}>{activeMailbox.name}</span>
					</div>
				) : (
					<div className="rounded-xl border bg-background/50 z-[50]">
						<MailListHeader
							mailboxThreads={mailboxThreads}
							mailboxSync={mailboxSync}
							publicConfig={publicConfig}
							identityMailboxes={identityMailboxes}
							activeMailbox={activeMailbox}
						/>

						{/*<ul role="list" className="divide-y bg-white rounded-4xl">*/}
						<ul role="list" className="divide-y rounded-4xl">
							{mailboxThreads.map((mailboxThreadItem) =>
								isMobile ? (
									<WebmailListItemMobile
										key={
											mailboxThreadItem.threadId + mailboxThreadItem.mailboxId
										}
										mailboxThreadItem={mailboxThreadItem}
										activeMailbox={activeMailbox}
										identityPublicId={identityPublicId}
										mailboxSync={mailboxSync}
									/>
								) : (
									<WebmailListItem
										key={
											mailboxThreadItem.threadId + mailboxThreadItem.mailboxId
										}
										mailboxThreadItem={mailboxThreadItem}
										activeMailbox={activeMailbox}
										identityPublicId={identityPublicId}
										mailboxSync={mailboxSync}
									/>
								),
							)}
						</ul>
					</div>
				)}
			</DynamicContextProvider>
		</>
	);
}
