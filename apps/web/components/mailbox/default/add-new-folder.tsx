import { useDisclosure } from "@mantine/hooks";
import { Modal, ActionIcon } from "@mantine/core";
import { Plus } from "lucide-react";
import * as React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import {
	addNewMailboxFolder,
	FetchIdentityMailboxListResult,
} from "@/lib/actions/mailbox";
import { useMailboxOptions } from "@/hooks/use-mailbox-options";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

export default function AddNewFolder({
	mailboxes,
	identity,
}: {
	mailboxes: FetchIdentityMailboxListResult[number]["mailboxes"];
	identity: FetchIdentityMailboxListResult[number]["identity"];
}) {
	const dict = useOptionalDictionary();
	const [opened, { open, close }] = useDisclosure(false);

	const { options: mailboxOptions } = useMailboxOptions({
		mailboxes: mailboxes as FetchIdentityMailboxListResult[number]["mailboxes"],
		identityLabel: identity.value,
	});

	const fields = [
		{
			name: "name",
			label: dict?.mailbox?.folderName ?? "Folder Name",
			wrapperClasses: "col-span-12",
			props: {},
		},
		{
			name: "imapOp",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: identity.smtpAccountId },
		},
		{
			name: "identityId",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: identity.id },
		},
		{
			name: "parentId",
			label: dict?.mailbox?.nestFolderUnder ?? "Nest Folder Under (Optional)",
			kind: "select" as const,
			options: mailboxOptions,
			wrapperClasses: "col-span-12",
			props: {
				className: "w-full",
				onChange: (val: unknown) => {
					console.log("Selected parent folder:", val);
				},
			},
		},
	];

	return (
		<>
			<Modal opened={opened} onClose={close} title={dict?.mailbox?.newFolder ?? "New folder"}>
				<ReusableForm
					fields={fields}
					onSuccess={close}
					action={addNewMailboxFolder}
				/>
			</Modal>

			<ActionIcon size={10} onClick={open}>
				<Plus />
			</ActionIcon>
		</>
	);
}
