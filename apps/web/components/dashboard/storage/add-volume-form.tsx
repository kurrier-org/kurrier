"use client";

import type { FieldConfig } from "@schema";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { addNewVolume } from "@/lib/actions/dashboard";

function AddVolumeForm({ onCompleted }: { onCompleted?: () => void }) {
	const dict = useOptionalDictionary();
	const fields: FieldConfig[] = [
		{
			name: "volumeName",
			label: dict?.platform?.volumeName ?? "Volume name",
			wrapperClasses: "col-span-12",
			bottomStartPrefix: (
				<span className="text-xs leading-5 text-muted-foreground">
					{dict?.platform?.volumeNameHelp ??
						"This name identifies the storage root that appears in Drive."}
				</span>
			),
			props: {
				autoComplete: "off",
				required: true,
				placeholder: dict?.platform?.volumeNamePlaceholder ?? "Team files",
			},
		},
	];

	const finalizeVolume = async () => {
		if (onCompleted) onCompleted();
	};

	return (
		<div>
			<ReusableForm
				action={addNewVolume}
				onSuccess={finalizeVolume}
				fields={fields}
				submitButtonProps={{
					submitLabel: dict?.platform?.createVolume ?? "Create volume",
					wrapperClasses: "justify-center mt-6 flex",
					buttonProps: {
						fullWidth: true,
					},
				}}
			/>
		</div>
	);
}

export default AddVolumeForm;
