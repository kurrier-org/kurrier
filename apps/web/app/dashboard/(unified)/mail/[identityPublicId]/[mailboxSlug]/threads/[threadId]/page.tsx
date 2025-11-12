import React from "react";
import {
	fetchMailbox,
	fetchWebMailThreadDetail,
	markAsRead,
} from "@/lib/actions/mailbox";
import ThreadItem from "@/components/mailbox/default/thread-item";
import { Divider } from "@mantine/core";

async function Page({
	params,
}: {
	params: Promise<{
		identityPublicId: string;
		mailboxSlug: string;
		threadId: string;
	}>;
}) {
	const { threadId, identityPublicId, mailboxSlug } = await params;
	const { activeMailbox, mailboxSync } = await fetchMailbox(
		identityPublicId,
		mailboxSlug,
	);
	// await markAsRead(threadId, activeMailbox.id, !!mailboxSync, false);
	const activeThread = await fetchWebMailThreadDetail(threadId);

	return (
		<>
			{activeThread?.messages.map((message, threadIndex) => {
				return (
					<div key={message.id}>
						<ThreadItem
							message={message}
							threadIndex={threadIndex}
							numberOfMessages={activeThread.messages.length}
							threadId={threadId}
							activeMailboxId={activeMailbox.id}
							markSmtp={!!mailboxSync}
						/>
						<Divider className={"opacity-50 mb-6"} ml={"xl"} mr={"xl"} />
					</div>
				);
			})}
		</>
	);
}

export default Page;
