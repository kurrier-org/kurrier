"use client";
import type { PublicConfig } from "@schema";
import { useParams } from "next/navigation";
import { use } from "react";
import MailListHeader from "@/components/mailbox/default/mail-list-header";
import WebmailListItem from "@/components/mailbox/default/webmail-list-item";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import type {
	FetchLabelsResult,
	FetchMailboxThreadLabelsResult,
} from "@/lib/actions/labels";
import type {
	FetchIdentityMailboxListResult,
	FetchMailboxResult,
	FetchMailboxThreadsResult,
} from "@/lib/actions/mailbox";

type WebListProps = {
	mailboxThreadPromise: Promise<{
		mailboxThreads: FetchMailboxThreadsResult;
		labelsByThreadId: FetchMailboxThreadLabelsResult;
	}>;
	publicConfig: PublicConfig;
	identityPublicId: string;
	identityMailboxesPromise: Promise<FetchIdentityMailboxListResult>;
	fetchMailboxPromise: Promise<FetchMailboxResult>;
	globalLabelsPromise: Promise<FetchLabelsResult>;
	workspacePublicId: string;
};

export default function WebmailList({
	mailboxThreadPromise,
	identityPublicId,
	publicConfig,
	identityMailboxesPromise,
	globalLabelsPromise,
	workspacePublicId,
	fetchMailboxPromise,
}: WebListProps) {
	const { labelsByThreadId, mailboxThreads } = use(mailboxThreadPromise);
	const globalLabels = use(globalLabelsPromise);
	const { mailboxSync, activeMailbox } = use(fetchMailboxPromise);
	const identityMailboxes = use(identityMailboxesPromise);
	const params = useParams();

	return (
		<div className={params?.threadId ? "hidden" : "min-w-0"}>
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
					<div className="min-w-0 overflow-hidden rounded-xl border bg-background/50">
						<MailListHeader
							mailboxThreads={mailboxThreads}
							mailboxSync={mailboxSync ?? undefined}
							publicConfig={publicConfig}
							identityMailboxes={identityMailboxes}
							activeMailbox={activeMailbox}
						/>

						<ul className="divide-y rounded-4xl">
							{mailboxThreads.map((mailboxThreadItem) => (
								<WebmailListItem
									key={mailboxThreadItem.threadId + mailboxThreadItem.mailboxId}
									mailboxThreadItem={mailboxThreadItem}
									workspacePublicId={workspacePublicId}
									activeMailbox={activeMailbox}
									identityPublicId={identityPublicId}
									mailboxSync={mailboxSync ?? undefined}
									globalLabels={globalLabels}
									labelsByThreadId={labelsByThreadId}
								/>
							))}
						</ul>
					</div>
				)}
			</DynamicContextProvider>
		</div>
	);
}
