import type { MessageEntity } from "@db";
import { Divider } from "@mantine/core";
import React, { Suspense } from "react";
import { connection } from "next/server";
import Loading from "@/app/loading";
import ThreadItem from "@/components/mailbox/default/thread-item";
import {
	fetchLabelsByIdentityPublicId,
	fetchMailboxThreadLabels,
} from "@/lib/actions/labels";
import {
	fetchMailbox,
	fetchThreadMailSubscriptions,
	fetchWebMailThreadDetail,
} from "@/lib/actions/mailbox";

async function ThreadContent({
								 params,
							 }: {
	params: Promise<{
		identityPublicId: string;
		mailboxSlug: string;
		threadId: string;
	}>;
}) {
	await connection();

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

	const allLabels = await fetchLabelsByIdentityPublicId({
		identityPublicId,
		scope: "thread",
	});

	const labelsByThreadId = await fetchMailboxThreadLabels([{ threadId }]);

	return (
		<>
			{activeThread?.messages.map((message, threadIndex) => (
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
						allLabels={allLabels}
						labelsByThreadId={labelsByThreadId}
					/>
					<Divider
						className="opacity-50 mb-6"
						ml="xl"
						mr="xl"
					/>
				</div>
			))}
		</>
	);
}

function Page({
				  params,
			  }: {
	params: Promise<{
		identityPublicId: string;
		mailboxSlug: string;
		threadId: string;
	}>;
}) {
	return (
		<Suspense fallback={<Loading />}>
			<ThreadContent params={params} />
		</Suspense>
	);
}

export default Page;
