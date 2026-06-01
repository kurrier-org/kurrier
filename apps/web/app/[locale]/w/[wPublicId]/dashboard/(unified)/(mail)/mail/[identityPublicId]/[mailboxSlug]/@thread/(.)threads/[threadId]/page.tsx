import React, {Suspense} from "react";
import {fetchMailbox, fetchThreadMailSubscriptions, fetchWebMailThreadDetail} from "@/lib/actions/mailbox";
import ThreadItem from "@/components/mailbox/default/thread-item";
import { Divider } from "@mantine/core";
import {MessageEntity} from "@db";
import Loading from "@/app/loading";

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

	const activeThread = await fetchWebMailThreadDetail(threadId);

    const { byMessageId } = await fetchThreadMailSubscriptions({
        ownerId: activeMailbox.ownerId,
        messages:
            activeThread?.messages.map((m: MessageEntity) => ({
                id: m.id,
                headersJson: m.headersJson,
            })) ?? [],
    });

	return (
		<>
			{activeThread?.messages.map((message, threadIndex) => {
				return (
					<Suspense fallback={<Loading />}>
						<div key={message.id}>
							<ThreadItem
								message={message}
								threadIndex={threadIndex}
								numberOfMessages={activeThread.messages.length}
								threadId={threadId}
								activeMailboxId={activeMailbox.id}
								markSmtp={!!mailboxSync}
								identityPublicId={identityPublicId}
								mailSubscription={byMessageId.get(message.id) ?? null}
							/>
							<Divider className={"opacity-50 mb-6"} ml={"xl"} mr={"xl"} />
						</div>
					</Suspense>
				);
			})}
		</>
	);
}

export default Page;
