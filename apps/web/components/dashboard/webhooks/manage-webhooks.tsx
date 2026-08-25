"use client";

import { Container } from "@/components/common/containers";
import {Card, Select, TagsInput} from "@mantine/core";
import { Temporal } from "@js-temporal/polyfill";
import * as React from "react";

import { Table, Badge } from "@mantine/core";
import {addWebhook, deleteWebhook, FetchUserAPIKeysResult, FetchUserWebhooksResult} from "@/lib/actions/dashboard";
import { ReusableForm } from "@/components/common/reusable-form";
import { ulid } from "ulid";
import {FieldConfig, webHookListOptions} from "@schema";
import {ReusableFormButton} from "@/components/common/reusable-form-button";
import {X} from "lucide-react";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

export default function ManageWebhooks({
	hooksList,
	identitiesOptions
}: {
	apiKeysList: FetchUserAPIKeysResult;
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
				nothingFoundMessage: dict?.platform?.noIdentitiesFound ?? "No identities found",
			},
		},
		{
			name: `scope`,
			label: dict?.platform?.scopes ?? "Scopes",
			kind: "custom" as const,
			options: webHookListOptions,
			component: TagsInput,
			wrapperClasses: "col-span-12 sm:col-span-6",
			props: {
				data: webHookListOptions,
				readOnly: true,
				defaultValue: webHookListOptions[0]
					? webHookListOptions.map((aO) => aO.value)
					: [],
				required: true,
				className: "w-full",
			},
		},
	];

	function fmtTemporal(input?: Date | string | null) {
		if (!input) return dict?.platform?.dashDash ?? "-";

		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const instant =
			input instanceof Date
				? Temporal.Instant.fromEpochMilliseconds(input.getTime())
				: Temporal.Instant.from(input);

		return instant
			.toZonedDateTimeISO(tz)
			.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
	}

	return (
		<>
			<Container variant="wide">
				<div className="flex items-center justify-between my-4">
					<h1 className="text-xl font-bold text-foreground">{dict?.platform?.webhooks ?? "Webhooks"}</h1>
				</div>

				<p className="max-w-prose text-sm text-muted-foreground my-6">
					{dict?.platform?.webhooksDescription ?? "Webhooks allow you to receive real-time notifications when you receive new emails."}
				</p>

				{identitiesOptions.length === 0 ? <div className={"text-center my-24"}>
					{dict?.platform?.noIdentitiesAvailableForWebhooks ?? "No identities available. Please create an identity to use webhooks."}
				</div> : <>

					<Card className="shadow-none mt-4">
						<div className="space-y-6 p-4">
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

					<Card className="shadow-none mt-6 !rounded-2xl border">
						<div className="p-4">
							{hooksList.length === 0 ? (
								<div className="text-sm text-muted-foreground">
									{dict?.platform?.noWebhooksYet ?? "No webhooks yet."}
								</div>
							) : (
								<Table verticalSpacing="sm" highlightOnHover>
									<Table.Thead>
										<Table.Tr>
											<Table.Th>{dict?.platform?.endpointUrl ?? "Endpoint URL"}</Table.Th>
											<Table.Th>{dict?.platform?.identity ?? "Identity"}</Table.Th>
											<Table.Th>{dict?.platform?.scope ?? "Scope"}</Table.Th>
											<Table.Th>{dict?.platform?.created ?? "Created"}</Table.Th>
											<Table.Th className="w-16 text-right">{dict?.platform?.actions ?? "Actions"}</Table.Th>
										</Table.Tr>
									</Table.Thead>

									<Table.Tbody>
										{hooksList.map((hook) => (
											<Table.Tr key={hook.webhooks.id}>
												<Table.Td className="font-mono text-xs">
													{hook.webhooks.url}
												</Table.Td>

												<Table.Td className="font-mono text-xs">
													{hook.identities?.value ?? (dict?.platform?.dashDash ?? "-")}
												</Table.Td>

												<Table.Td>
													<Badge variant="light" radius="sm">
														message.received
													</Badge>
												</Table.Td>

												<Table.Td>
													{fmtTemporal(hook.webhooks.createdAt)}
												</Table.Td>

												<Table.Td className="text-right">
													<ReusableFormButton
														action={deleteWebhook}
														label={dict?.platform?.delete ?? "Delete"}
														buttonProps={{
															leftSection: <X size={16} />,
															size: "compact-xs",
															variant: "light"
													}}
													>
														<input type="hidden" name="id" value={hook.webhooks.id} />
													</ReusableFormButton>
												</Table.Td>
											</Table.Tr>
										))}
									</Table.Tbody>
								</Table>
							)}
						</div>
					</Card>

				</>}


			</Container>
		</>
	);
}
