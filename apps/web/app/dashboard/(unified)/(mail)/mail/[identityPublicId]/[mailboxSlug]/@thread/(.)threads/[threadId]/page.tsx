import {
	fetchMailbox,
	fetchThreadMailSubscriptions,
	fetchWebMailThreadDetail,
} from "@/lib/actions/mailbox";
import ThreadItem from "@/components/mailbox/default/thread-item";
import ThreadNavigationControls from "@/components/mailbox/default/thread-navigation-controls";
import { Divider } from "@mantine/core";
import type { MessageEntity } from "@db";

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
	const [mailboxResult, activeThread] = await Promise.all([
		fetchMailbox(identityPublicId, mailboxSlug),
		fetchWebMailThreadDetail(threadId),
	]);
	const { activeMailbox, mailboxSync } = mailboxResult;

	if (!activeMailbox) {
		return (
			<div className="p-4 text-sm text-muted-foreground">
				Mailbox is not available yet. Refresh this page in a moment.
			</div>
		);
	}

	const baseHref = `/dashboard/mail/${identityPublicId}/${mailboxSlug}`;
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
			<ThreadNavigationControls
				backHref={baseHref}
				messageCount={activeThread?.messages.length ?? 0}
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
						/>
						<Divider className={"opacity-50 mb-6"} ml={"xl"} mr={"xl"} />
					</div>
				);
			})}
		</>
	);
}

export default Page;
