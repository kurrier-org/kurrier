import { getMessageAddress, getMessageName } from "@common/mail-client";
import type { MessageEntity } from "@db";
import { Avatar } from "@mantine/core";
import { getPublicEnv } from "@schema";
import React from "react";
import { Container } from "@/components/common/containers";
import EmailRenderer from "@/components/mailbox/default/email-renderer";
import EmailViewer from "@/components/mailbox/default/email-viewer";
import RenderInvite from "@/components/mailbox/default/render-invite";
import { fetchEventPreviewItems } from "@/lib/actions/calendar";
import type {
	FetchLabelsResult,
	FetchMailboxThreadLabelsResult,
} from "@/lib/actions/labels";
import {
	type FetchThreadMailSubsResult,
	fetchIdentityMailboxList,
	fetchMessageAttachments,
	getSignedUrlsForMessage,
} from "@/lib/actions/mailbox";

export default async function ThreadItem({
	message,
	threadIndex,
	numberOfMessages,
	threadId,
	activeMailboxId,
	markSmtp,
	identityPublicId,
	mailSubscription,
	allLabels,
	labelsByThreadId,
}: {
	message: MessageEntity;
	threadIndex: number;
	numberOfMessages: number;
	threadId: string;
	activeMailboxId: string;
	markSmtp: boolean;
	identityPublicId: string;
	mailSubscription: FetchThreadMailSubsResult["byMessageId"] | null;
	allLabels: FetchLabelsResult;
	labelsByThreadId: FetchMailboxThreadLabelsResult;
}) {
	const attachments = await getSignedUrlsForMessage(message.id);
	const publicConfig = getPublicEnv();
	const preview = await fetchEventPreviewItems(attachments, identityPublicId);
	const identityMailboxes = await fetchIdentityMailboxList();

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
						{preview?.calendarEvent &&
							preview?.attendees &&
							preview?.identity && (
								<RenderInvite
									calendarEvent={preview.calendarEvent}
									attendees={preview.attendees ?? []}
									identity={preview.identity}
								/>
							)}

						<EmailRenderer
							threadIndex={threadIndex}
							numberOfMessages={numberOfMessages}
							message={message}
							attachments={attachments}
							publicConfig={publicConfig}
							threadId={threadId}
							markSmtp={markSmtp}
							activeMailboxId={activeMailboxId}
							mailSubscription={mailSubscription}
							identityMailboxes={identityMailboxes}
							allLabels={allLabels}
							labelsByThreadId={labelsByThreadId}
						>
							<EmailViewer message={message} />
						</EmailRenderer>
					</div>
				</div>
			</Container>
		</>
	);
}
