"use client";

import type { ContactEntity } from "@db";
import { ActionIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { responsiveModalActionsClassName } from "@/components/common/modal-actions";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

type DeleteContactButtonProps = {
	contact: ContactEntity;
	workspacePublicId: string;
	onDeleteAction: (id: string) => Promise<{ success: boolean }>;
};

function DeleteContactButton({
	contact,
	workspacePublicId,
	onDeleteAction,
}: DeleteContactButtonProps) {
	const dict = useOptionalDictionary();
	const router = useRouter();
	const confirmDeleteContact = () => {
		if (!contact.id) return;

		modals.openConfirmModal({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.contacts?.deleteContact ?? "Delete Contact"}
				</div>
			),
			centered: true,
			children: (
				<div className="text-sm">
					{dict?.contacts?.confirmDeleteContactPrefix ??
						"Are you sure you want to delete"}{" "}
					<b>
						{contact.firstName} {contact.lastName}
					</b>
					{dict?.contacts?.confirmDeleteContactSuffix ??
						"? This will remove the contact permanently."}
				</div>
			),
			labels: {
				confirm: dict?.contacts?.delete ?? "Delete",
				cancel: dict?.contacts?.cancel ?? "Cancel",
			},
			confirmProps: { color: "red" },
			groupProps: { className: responsiveModalActionsClassName },
			onConfirm: async () => {
				await onDeleteAction(contact.id);
				router.push(`/w/${workspacePublicId}/dashboard/contacts`);
			},
		});
	};

	return (
		<ActionIcon
			onClick={confirmDeleteContact}
			size="md"
			className={"-mt-1"}
			variant={"subtle"}
		>
			<IconTrash size={14} stroke={1.5} />
		</ActionIcon>
	);
}

export default DeleteContactButton;
