"use client";

import { Badge, Group, Switch, Text } from "@mantine/core";
import type { FieldConfig, FormState } from "@schema";
import { useState } from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	saveVacationSettings,
	type VacationSettings,
} from "@/lib/actions/vacation";

function localDate(value: string | null) {
	if (!value) return "";
	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 16);
}

export default function VacationSettingsForm({
	identityId,
	settings,
	onCompleted,
}: {
	identityId: string;
	settings: VacationSettings;
	onCompleted: () => void;
}) {
	const dict = useOptionalDictionary();
	const [enabled, setEnabled] = useState(settings.enabled);
	const now = Date.now();
	const status = !settings.enabled
		? "disabled"
		: settings.ends_at && Date.parse(settings.ends_at) <= now
			? "ended"
			: settings.starts_at && Date.parse(settings.starts_at) > now
				? "scheduled"
				: "active";
	const statusLabel =
		{
			disabled: dict?.platform?.vacationDisabled,
			ended: dict?.platform?.vacationEnded,
			scheduled: dict?.platform?.vacationScheduled,
			active: dict?.platform?.vacationActive,
		}[status] ?? status;
	const fields: FieldConfig[] = [
		{
			el: (
				<Group justify="space-between" gap="sm">
					<Text size="sm" c="dimmed">
						{dict?.platform?.vacationStatus ?? "Current status"}
					</Text>
					<Badge
						variant="light"
						color={
							status === "active"
								? "green"
								: status === "scheduled"
									? "blue"
									: "gray"
						}
					>
						{statusLabel}
					</Badge>
				</Group>
			),
		},
		{
			kind: "custom",
			name: "enabled",
			component: Switch,
			props: {
				id: "vacation-enabled",
				label: dict?.platform?.vacationEnabled ?? "Enable vacation replies",
				checked: enabled,
				onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
					setEnabled(event.currentTarget.checked),
				description:
					dict?.platform?.vacationHelp ??
					"Each sender receives one reply during this vacation period.",
			},
		},
		{
			name: "subject",
			label: dict?.platform?.vacationSubject ?? "Subject",
			props: {
				id: "subject",
				defaultValue: settings.subject,
				maxLength: 200,
				required: enabled,
				autoComplete: "off",
			},
		},
		{
			name: "message",
			label: dict?.platform?.vacationMessage ?? "Message",
			kind: "textarea",
			props: {
				id: "message",
				defaultValue: settings.message,
				maxLength: 10000,
				required: enabled,
				autosize: true,
				minRows: 5,
				maxRows: 12,
			},
		},
		...(["starts_at", "ends_at"] as const).map((name) => ({
			name,
			label:
				name === "starts_at"
					? (dict?.platform?.vacationStart ?? "Start (optional)")
					: (dict?.platform?.vacationEnd ?? "End (optional)"),
			wrapperClasses: "col-span-12 sm:col-span-6",
			props: {
				id: name,
				type: "datetime-local",
				defaultValue: localDate(settings[name]),
			},
		})),
		{
			el: (
				<Text size="xs" c="dimmed">
					{(
						dict?.platform?.vacationTimezone ??
						"Dates use {timezone}. Leave dates empty to start now and continue until disabled."
					).replace(
						"{timezone}",
						Intl.DateTimeFormat().resolvedOptions().timeZone,
					)}
				</Text>
			),
		},
	];
	async function save(
		_previous: FormState,
		formData: FormData,
	): Promise<FormState> {
		try {
			const date = (name: string) => {
				const value = String(formData.get(name) ?? "");
				return value ? new Date(value).toISOString() : null;
			};
			const starts_at = date("starts_at");
			const ends_at = date("ends_at");
			if (starts_at && ends_at && starts_at >= ends_at) {
				return {
					errors: {
						ends_at: [
							dict?.platform?.vacationInvalidDates ?? "End must follow start",
						],
					},
				};
			}
			await saveVacationSettings(identityId, {
				enabled,
				subject: String(formData.get("subject") ?? ""),
				message: String(formData.get("message") ?? ""),
				starts_at,
				ends_at,
			});
			return { success: true };
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: (dict?.platform?.vacationSaveError ?? "Could not save settings"),
			};
		}
	}
	return (
		<ReusableForm
			fields={fields}
			action={save}
			onSuccess={onCompleted}
			submitButtonProps={{
				submitLabel: dict?.platform?.vacationSave ?? "Save changes",
				wrapperClasses: "mt-6",
				fullWidth: true,
			}}
		/>
	);
}
