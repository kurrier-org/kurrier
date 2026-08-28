"use client";

import { Temporal } from "@js-temporal/polyfill";
import { Badge, Card, Select, Table, TagsInput } from "@mantine/core";
import type { FieldConfig } from "@schema";
import { webHookListOptions } from "@schema";
import { Webhook, X } from "lucide-react";
import { ulid } from "ulid";
import ContentPlaceholder from "@/components/common/content-placeholder";
import { ReusableForm } from "@/components/common/reusable-form";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	addWebhook,
	deleteWebhook,
	type FetchUserWebhooksResult,
} from "@/lib/actions/dashboard";

export default function ManageWebhooks({
	hooksList,
	identitiesOptions,
}: {
	hooksList: FetchUserWebhooksResult;
	identitiesOptions: { label: string; value: string }[];
}) {
	const dict = useOptionalDictionary();

	const fields: FieldConfig[] = [
		{
			name: "ulid",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: ulid() },
		},
		{
			name: "url",
			label: dict?.platform?.endpointUrl ?? "Endpoint URL",
			wrapperClasses: "col-span-12",
			props: {
				required: true,
				placeholder: "https://example.com/webhook-endpoint",
			},
		},
		{
			name: "identityId",
			label: dict?.platform?.selectIdentity ?? "Select Identity",
			wrapperClasses: "col-span-12 sm:col-span-6",
			kind: "custom",
			component: Select,
			props: {
				data: identitiesOptions,
				searchable: true,
				required: true,
				allowDeselect: false,
				clearable: false,
				defaultValue: identitiesOptions[0]?.value,
				nothingFoundMessage:
					dict?.platform?.noIdentitiesFound ?? "No identities found",
			},
		},
		{
			name: "scope",
			label: dict?.platform?.scopes ?? "Scopes",
			kind: "custom" as const,
			options: webHookListOptions,
			component: TagsInput,
			wrapperClasses: "col-span-12 sm:col-span-6",
			props: {
				data: webHookListOptions,
				readOnly: true,
				defaultValue: webHookListOptions[0]
					? webHookListOptions.map((option) => option.value)
					: [],
				required: true,
				className: "w-full",
			},
		},
	];

	function fmtTemporal(input?: Date | string | null) {
		if (!input) return dict?.platform?.dashDash ?? "-";

		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const instant =
			input instanceof Date
				? Temporal.Instant.fromEpochMilliseconds(input.getTime())
				: Temporal.Instant.from(input);

		return instant.toZonedDateTimeISO(timezone).toLocaleString(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		});
	}

	return (
		<div className="space-y-6">
			<Card className="border shadow-none">
				<div className="p-4 sm:p-6">
					<ReusableForm
						action={addWebhook}
						fields={fields}
						submitButtonProps={{
							submitLabel: dict?.platform?.createWebhook ?? "Create Webhook",
							wrapperClasses: "justify-center mt-6 flex",
							fullWidth: true,
						}}
					/>
				</div>
			</Card>

			<Card className="!rounded-xl border shadow-none">
				{hooksList.length === 0 ? (
					<ContentPlaceholder
						className="min-h-64 py-10"
						icon={<Webhook className="size-5" aria-hidden="true" />}
						title={dict?.platform?.noWebhooksYet ?? "No webhooks yet."}
					/>
				) : (
					<div className="overflow-x-auto p-4 sm:p-6">
						<Table
							className="min-w-[48rem]"
							verticalSpacing="sm"
							highlightOnHover
						>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>
										{dict?.platform?.endpointUrl ?? "Endpoint URL"}
									</Table.Th>
									<Table.Th>{dict?.platform?.identity ?? "Identity"}</Table.Th>
									<Table.Th>{dict?.platform?.scope ?? "Scope"}</Table.Th>
									<Table.Th>{dict?.platform?.created ?? "Created"}</Table.Th>
									<Table.Th className="w-16 text-right">
										{dict?.platform?.actions ?? "Actions"}
									</Table.Th>
								</Table.Tr>
							</Table.Thead>

							<Table.Tbody>
								{hooksList.map((hook) => (
									<Table.Tr key={hook.webhooks.id}>
										<Table.Td className="max-w-72 break-all font-mono text-xs">
											{hook.webhooks.url}
										</Table.Td>
										<Table.Td className="font-mono text-xs">
											{hook.identities?.value ??
												dict?.platform?.dashDash ??
												"-"}
										</Table.Td>
										<Table.Td>
											<Badge variant="light" radius="sm">
												message.received
											</Badge>
										</Table.Td>
										<Table.Td>{fmtTemporal(hook.webhooks.createdAt)}</Table.Td>
										<Table.Td className="text-right">
											<ReusableFormButton
												action={deleteWebhook}
												label={dict?.platform?.delete ?? "Delete"}
												buttonProps={{
													leftSection: <X size={16} />,
													size: "compact-xs",
													variant: "light",
												}}
											>
												<input
													type="hidden"
													name="id"
													value={hook.webhooks.id}
												/>
											</ReusableFormButton>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					</div>
				)}
			</Card>
		</div>
	);
}
