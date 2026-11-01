"use client";

import React from "react";
import type { MailboxEntity } from "@db";
import { Button, Modal, Select } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFolderSymlink } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { useMailboxOptions } from "@/hooks/use-mailbox-options";
import {
	type FetchIdentityMailboxListResult,
	moveToFolder,
} from "@/lib/actions/mailbox";

function MoveToFolder({
						  identityMailboxes,
						  activeMailbox,
					  }: {
	identityMailboxes: FetchIdentityMailboxListResult;
	activeMailbox: MailboxEntity;
}) {
	const dict = useOptionalDictionary();
	const [opened, { open, close }] = useDisclosure(false);
	const params = useParams();

	const entry =
		identityMailboxes.find(
			(im) => im.identity.publicId === params.identityPublicId,
		) ?? null;

	const mailboxes = entry?.mailboxes ?? [];

	const { options: mailboxOptions } = useMailboxOptions({
		mailboxes,
		identityLabel:
			entry?.identity?.value ?? (dict?.mailbox?.folders ?? "Folders"),
	});

	const { state } = useDynamicContext<{
		selectedThreadIds: Set<string>;
		activeMailbox?: MailboxEntity | null;
		identityPublicId: string;
	}>();

	const [destId, setDestId] = React.useState<string | null>(null);

	const selectedThreadIds = Array.from(state?.selectedThreadIds ?? []);

	const canMove =
		selectedThreadIds.length > 0 &&
		!!destId &&
		destId !== "none" &&
		destId !== activeMailbox.id;

	const onClose = () => {
		close();
		setDestId(null);
	};

	return (
		<>
			<Modal
				opened={opened}
				onClose={onClose}
				title={dict?.mailbox?.moveTo ?? "Move to"}
			>
				<div className="space-y-4">
					<Select
						data={mailboxOptions[0]?.items ?? []}
						label={dict?.mailbox?.chooseFolder ?? "Choose folder"}
						placeholder={dict?.mailbox?.selectEllipsis ?? "Select…"}
						value={destId}
						onChange={setDestId}
						searchable
						nothingFoundMessage={
							dict?.mailbox?.noFolders ?? "No folders"
						}
					/>

					<div className="flex justify-end gap-2">
						<Button variant="default" onClick={onClose}>
							{dict?.common?.cancel ?? "Cancel"}
						</Button>

						<ReusableFormButton
							action={moveToFolder}
							label={dict?.mailbox?.move ?? "Move"}
							buttonProps={{
								disabled: !canMove,
							}}
							onSuccess={onClose}
							notify={{
								kind: "toast",
								successMessage:
									dict?.mailbox?.movedToFolder ?? "Moved to folder",
								toastProps: { position: "bottom-left" },
							}}
						>
							{selectedThreadIds.map((threadId) => (
								<input
									key={threadId}
									type="hidden"
									name="threadId"
									value={threadId}
								/>
							))}
							<input
								type="hidden"
								name="fromMailboxId"
								value={activeMailbox.id}
							/>
							<input
								type="hidden"
								name="toMailboxId"
								value={destId ?? ""}
							/>
						</ReusableFormButton>
					</div>
				</div>
			</Modal>

			<button
				type="button"
				onClick={open}
				className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-muted"
				title={dict?.mailbox?.moveToFolder ?? "Move to folder"}
			>
				<IconFolderSymlink className="h-5 w-5" />
			</button>
		</>
	);
}

export default MoveToFolder;
