import React from "react";
import { MessageEntity } from "@db";
import EmailViewer from "@/components/mailbox/default/email-viewer";
import EmailRenderer from "@/components/mailbox/default/email-renderer";
import { Avatar } from "@mantine/core";
import { fetchMessageAttachments } from "@/lib/actions/mailbox";
import { getPublicEnv } from "@schema";
import { getMessageAddress, getMessageName } from "@common/mail-client";

export default async function ThreadItem({
	message,
    threadIndex,
    numberOfMessages
}: {
	message: MessageEntity;
    threadIndex: number
    numberOfMessages: number
}) {
	const { attachments } = await fetchMessageAttachments(message.id);
	const publicConfig = getPublicEnv();

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className={"flex gap-4"}>
				<div className={`flex-shrink flex flex-col items-center ${threadIndex === 0 ? 'pt-12' : 'pt-4'}`}>
					<Avatar
						name={getMessageName(message, "from") || getMessageAddress(message, "from") || ""}
						color="initials"
					/>
				</div>
				<div className={"flex-grow flex flex-col gap-2"}>
					<EmailRenderer
                        threadIndex={threadIndex}
                        numberOfMessages={numberOfMessages}
						message={message}
						attachments={attachments}
						publicConfig={publicConfig}
					>
						<EmailViewer message={message} />
					</EmailRenderer>
				</div>
			</div>
		</div>
	);
}
