import React from "react";
import { MessageEntity } from "@db";
import EmailViewer from "@/components/mailbox/default/email-viewer";
import EmailRenderer from "@/components/mailbox/default/email-renderer";
import { Avatar } from "@mantine/core";
import { fetchMessageAttachments } from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import { Container } from "@/components/common/containers";

export default async function ThreadItem({
	message,
	threadIndex,
	numberOfMessages,
	threadId,
	activeMailboxId,
	markSmtp,
}: {
	message: MessageEntity;
	threadIndex: number;
	numberOfMessages: number;
	threadId: string;
	activeMailboxId: string;
	markSmtp: boolean;
}) {
	const { attachments } = await fetchMessageAttachments(message.id);
	const publicConfig = getPublicEnv();
	return (
		<>
			<Container variant="wide">
				<div className={"grid grid-cols-12 p-3"}>
					<div className={"md:col-span-1 hidden"}>
						<Avatar
							name={
								getMessageName(message, "from") ||
								getMessageAddress(message, "from") ||
								""
							}
							color="initials"
						/>
					</div>
					<div className={"col-span-12 md:col-span-11"}>
						<EmailRenderer
							threadIndex={threadIndex}
							numberOfMessages={numberOfMessages}
							message={message}
							attachments={attachments}
							publicConfig={publicConfig}
							threadId={threadId}
							markSmtp={markSmtp}
							activeMailboxId={activeMailboxId}
						>
							<EmailViewer message={message} />
						</EmailRenderer>
					</div>
				</div>
			</Container>
		</>
	);
}
