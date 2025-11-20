"use client";

import { useDisclosure } from "@mantine/hooks";
import { Modal, ActionIcon, ColorPicker } from "@mantine/core";
import * as React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { IconPlus } from "@tabler/icons-react";
import { addNewLabel, FetchLabelsResult } from "@/lib/actions/labels";
import ReusableFormCustomWrapper from "@/components/common/reusable-form-custom-wrapper";
import { DEFAULT_COLORS_SWATCH } from "@common/mail-client";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

function useLabelOptions({ labels }: { labels: any[] }) {
	const options = labels.map((l) => ({
		label: l.name,
		value: l.id,
	}));

	return { options };
}

export default function AddNewLabel({
	globalLabels,
}: {
	globalLabels: FetchLabelsResult;
}) {
	const [opened, { open, close }] = useDisclosure(false);

	const { options: labelOptions } = useLabelOptions({ labels: globalLabels });
	const { state } = useDynamicContext();

	const fields = [
		{
			name: "name",
			label: "Label Name",
			wrapperClasses: "col-span-12",
			props: {
				placeholder: "e.g., Work, Finance, Travel...",
			},
		},
		{
			name: "parentId",
			label: "Nest Label Under (Optional)",
			kind: "select" as const,
			options: labelOptions,
			wrapperClasses: "col-span-12",
			props: {
				className: "w-full",
			},
		},
		{
			name: "scope",
			type: "hidden",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: state.scope },
		},
		{
			name: "color",
			wrapperClasses: "col-span-12 flex justify-center my-3",
			kind: "custom" as const,
			component: ReusableFormCustomWrapper,
			props: {
				size: "sm",
				format: "hex",
				swatches: DEFAULT_COLORS_SWATCH,
				component: ColorPicker,
				defaultValue: "#228be6",
			},
		},
	];

	return (
		<>
			<Modal opened={opened} onClose={close} title="New Label" size="sm">
				<ReusableForm
					fields={fields}
					onSuccess={close}
					action={addNewLabel}
					submitButtonProps={{
						submitLabel: "Create label",
						wrapperClasses: "flex justify-center my-4",
					}}
				/>
			</Modal>

			<ActionIcon variant="light" size="xs" onClick={open}>
				<IconPlus size={12} />
			</ActionIcon>
		</>
	);
}
