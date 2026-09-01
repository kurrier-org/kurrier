import type { MessageEntity } from "@db";
import { Divider } from "@mantine/core";
import ThreadBackLink from "@/components/mailbox/default/thread-back-link";
import ThreadItem from "@/components/mailbox/default/thread-item";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import {
	fetchLabelsByIdentityPublicId,
	fetchMailboxThreadLabels,
} from "@/lib/actions/labels";
import {
	fetchMailbox,
	fetchThreadMailSubscriptions,
	fetchWebMailThreadDetail,
} from "@/lib/actions/mailbox";

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

	const [activeThread, workspacePublicId] = await Promise.all([
		fetchWebMailThreadDetail(threadId, activeMailbox.id),
		getWorkspacePublicId(),
	]);

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
			<ThreadBackLink
				href={`/w/${workspacePublicId}/dashboard/mail/${identityPublicId}/${mailboxSlug}`}
			/>
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
							identityPublicId={identityPublicId}
							mailSubscription={byMessageId.get(message.id) ?? null}
							allLabels={allLabels}
							labelsByThreadId={labelsByThreadId}
						/>
						<Divider className={"opacity-50 mb-6"} ml={"xl"} mr={"xl"} />
					</div>
				);
			})}
		</>
	);
}

export default Page;
