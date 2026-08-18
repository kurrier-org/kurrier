"use client";
import { ContactEntity, LabelEntity } from "@db";
import { LabelAssignPopover } from "./label-assign-popover";
import {
	addLabelToContact,
	FetchContactLabelsByIdResult,
	removeLabelFromContact,
} from "@/lib/actions/labels";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

type ContactLabelHoverButtonsProps = {
	contact: ContactEntity;
	allLabels: LabelEntity[];
	labelsByContactId: FetchContactLabelsByIdResult;
};

export function ContactLabelHoverButtons({
	contact,
	allLabels,
	labelsByContactId,
}: ContactLabelHoverButtonsProps) {
	const dict = useOptionalDictionary();
	const labelContacts = labelsByContactId[contact.id] || [];
	const selectedLabelIds = labelContacts
		.map((lc) => lc?.label?.id)
		.filter(Boolean) as string[];

	const handleToggle = async (labelId: string, nextChecked: boolean) => {
		if (nextChecked) {
			await addLabelToContact({
				contactId: contact.id,
				labelId,
			});
		} else {
			await removeLabelFromContact({
				contactId: contact.id,
				labelId,
			});
		}
	};

	return (
		<LabelAssignPopover
			title={dict?.contacts?.labelContact ?? "Label contact"}
			scope="contact"
			allLabels={allLabels}
			selectedLabelIds={selectedLabelIds}
			onToggleLabel={handleToggle}
		/>
	);
}
