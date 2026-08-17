"use client";

import type { MailboxThreadEntity } from "@db";
import { LabelAssignPopover } from "@/components/dashboard/labels/label-assign-popover";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	addLabelToThread,
	type FetchLabelsResult,
	type FetchMailboxThreadLabelsResult,
	removeLabelFromThread,
} from "@/lib/actions/labels";

type ThreadLabelHoverButtonsProps = {
	mailboxThreadItem: MailboxThreadEntity;
	allLabels: FetchLabelsResult;
	labelsByThreadId: FetchMailboxThreadLabelsResult;
};

export function ThreadLabelHoverButtons({
	mailboxThreadItem,
	allLabels,
	labelsByThreadId,
}: ThreadLabelHoverButtonsProps) {
	const dict = useOptionalDictionary();
	const labelThreads = labelsByThreadId[mailboxThreadItem.threadId] || [];
	const selectedLabelIds = labelThreads
		.map((lt) => lt?.label?.id)
		.filter(Boolean) as string[];

	const handleToggle = async (labelId: string, nextChecked: boolean) => {
		if (nextChecked) {
			await addLabelToThread({
				threadId: mailboxThreadItem.threadId,
				mailboxId: mailboxThreadItem.mailboxId,
				labelId,
			});
		} else {
			await removeLabelFromThread({
				threadId: mailboxThreadItem.threadId,
				mailboxId: mailboxThreadItem.mailboxId,
				labelId,
			});
		}
	};

	return (
		<LabelAssignPopover
			title={dict?.mailbox?.labelMessage ?? "Label message"}
			scope="thread"
			allLabels={allLabels}
			selectedLabelIds={selectedLabelIds}
			onToggleLabel={handleToggle}
		/>
	);
}

export default ThreadLabelHoverButtons;
