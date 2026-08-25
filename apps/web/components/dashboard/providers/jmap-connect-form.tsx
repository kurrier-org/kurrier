"use client";

import { PasswordInput, Select } from "@mantine/core";
import { JMAP_PRESETS, type JmapPresetKey } from "@schema";
import * as React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { connectJmap, updateJmapToken } from "@/lib/actions/jmap-actions";

export default function JmapConnectForm({
	onCompleted,
	jmapAccountId,
	presetKey,
	submitLabel,
	successMessage,
}: {
	onCompleted: () => void;
	jmapAccountId?: string;
	presetKey?: JmapPresetKey;
	submitLabel?: string;
	successMessage?: string;
}) {
	const dict = useOptionalDictionary();
	const isUpdate = !!jmapAccountId;

	const presetOptions = Object.values(JMAP_PRESETS).map((preset) => ({
		value: preset.key,
		label: preset.name,
	}));

	const fields = [
		...(isUpdate
			? [
					{
						name: "jmapAccountId",
						wrapperClasses: "hidden",
						props: {
							type: "hidden",
							hidden: true,
							defaultValue: jmapAccountId,
						},
					},
				]
			: [
					{
						name: "preset",
						label: dict?.platform?.jmapProviderFieldLabel ?? "Provider",
						kind: "custom" as const,
						component: Select,
						wrapperClasses: "col-span-12",
						props: {
							required: true,
							data: presetOptions,
							allowDeselect: false,
							defaultValue: presetKey ?? "fastmail",
							description:
								dict?.platform?.jmapChooseKnownProviderHelp ??
								"Choose a known JMAP provider.",
						},
					},
				]),
		{
			name: "token",
			label: dict?.platform?.jmapApiTokenLabel ?? "API token",
			kind: "custom" as const,
			component: PasswordInput,
			wrapperClasses: "col-span-12",
			props: {
				required: true,
				placeholder:
					dict?.platform?.jmapApiTokenPlaceholder ?? "Paste API token",
				description: isUpdate
					? (dict?.platform?.jmapNewTokenHelp ??
						"Enter a new API token for this JMAP account.")
					: (dict?.platform?.jmapTokenAccessHelp ??
						"Use an API token with JMAP Mail and Submission access."),
			},
		},
	];

	return (
		<div className="p-2">
			<ReusableForm
				action={isUpdate ? updateJmapToken : connectJmap}
				fields={fields}
				onSuccess={onCompleted}
				notify={{
					kind: "toast",
					successMessage:
						successMessage ??
						(isUpdate
							? (dict?.platform?.jmapTokenUpdatedToast ?? "JMAP token updated")
							: (dict?.platform?.jmapAccountConnectedToast ??
								"JMAP account connected")),
				}}
				submitButtonProps={{
					submitLabel:
						submitLabel ??
						(isUpdate
							? (dict?.platform?.updateToken ?? "Update Token")
							: (dict?.common?.connect ?? "Connect")),
					wrapperClasses: "mt-6 inline-flex",
				}}
			/>
		</div>
	);
}
