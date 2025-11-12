"use client";

import { Container } from "@/components/common/containers";
import { Card, TagsInput } from "@mantine/core";
import { toast } from "sonner";
import { Temporal } from "@js-temporal/polyfill";
import * as React from "react";

import { Table, Group, Badge, ActionIcon } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { addApiKey, FetchUserAPIKeysResult } from "@/lib/actions/dashboard";
import { ReusableForm } from "@/components/common/reusable-form";
import { ulid } from "ulid";
import { apiScopeOptions } from "@schema";

export default function ManageApiKeys({
	apiKeysList,
}: {
	apiKeysList: FetchUserAPIKeysResult;
}) {
	const handleCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toast.info("Copied API key");
	};

	const fields = [
		{
			name: "ulid",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: ulid() },
		},
		{
			name: "name",
			label: "Key Name",
			wrapperClasses: "col-span-12 sm:col-span-6",
			props: { required: true },
		},
		{
			name: `scope`,
			label: "Scopes",
			kind: "custom" as const,
			options: apiScopeOptions,
			component: TagsInput,
			required: true,
			wrapperClasses: "col-span-12 sm:col-span-6",
			props: {
				data: apiScopeOptions,
				readOnly: true,
				defaultValue: apiScopeOptions[0]
					? apiScopeOptions.map((aO) => aO.value)
					: [],
				required: true,
				className: "w-full",
			},
		},
	];

	function fmtTemporal(input?: Date | string | null) {
		if (!input) return "-";

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
					<h1 className="text-xl font-bold text-foreground">API Keys</h1>
				</div>

				<p className="max-w-prose text-sm text-muted-foreground my-6">
					Create and manage API keys for server-to-server access.
				</p>

				<Card className="shadow-none mt-4">
					<div className="space-y-6 p-4">
						<ReusableForm
							action={addApiKey}
							fields={fields}
							submitButtonProps={{
								submitLabel: "Create Key",
								wrapperClasses: "justify-center mt-6 flex",
								fullWidth: true,
							}}
						/>
					</div>
				</Card>

				<Card className="shadow-none mt-6 !rounded-2xl border">
					<div className="p-4">
						{apiKeysList.length === 0 ? (
							<div className="text-sm text-muted-foreground">
								No API keys yet.
							</div>
						) : (
							<Table verticalSpacing="sm" highlightOnHover>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Name</Table.Th>
										<Table.Th>Key ID</Table.Th>
										<Table.Th>Scopes</Table.Th>
										<Table.Th>Created</Table.Th>
										<Table.Th className="w-16 text-right">Actions</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{apiKeysList.map((k) => (
										<Table.Tr key={k.id}>
											<Table.Td>{k.name}</Table.Td>
											<Table.Td className="font-mono text-xs">{k.id}</Table.Td>
											<Table.Td>
												<Group gap="xs">
													{k.scopes.map((s) => (
														<Badge key={s} variant="light" radius="sm">
															{s}
														</Badge>
													))}
												</Group>
											</Table.Td>
											<Table.Td>{fmtTemporal(k.createdAt)}</Table.Td>
											<Table.Td className="text-right">
												<ActionIcon
													variant="subtle"
													title={"Copy API key"}
													aria-label="Copy API key"
													onClick={() => handleCopy(k.vault.rawKey)}
												>
													<IconCopy size={16} />
												</ActionIcon>
											</Table.Td>
										</Table.Tr>
									))}
								</Table.Tbody>
							</Table>
						)}
					</div>
				</Card>
			</Container>
		</>
	);
}
