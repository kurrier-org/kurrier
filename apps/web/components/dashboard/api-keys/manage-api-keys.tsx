"use client";

import { Temporal } from "@js-temporal/polyfill";
import { Badge } from "@mantine/core";
import { apiScopeList, type FieldConfig } from "@schema";
import {
	BookOpen,
	CheckCircle2,
	Copy,
	FilePenLine,
	Inbox,
	KeyRound,
	Send,
} from "lucide-react";
import { toast } from "sonner";
import { ulid } from "ulid";
import { ReusableForm } from "@/components/common/reusable-form";
import DashboardEmptyState from "@/components/dashboard/dashboard-empty-state";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	addApiKey,
	type FetchUserAPIKeysResult,
} from "@/lib/actions/dashboard";

function ScopeBadges({ scopes }: { scopes: readonly string[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{scopes.map((scope) => (
				<Badge key={scope} variant="light" radius="sm">
					{scope}
				</Badge>
			))}
		</div>
	);
}

function ApiScopeSummary({ name }: { name: string }) {
	const dict = useOptionalDictionary();
	const scopes = [
		{
			value: "emails:send",
			icon: Send,
			title: dict?.platform?.scopeEmailsSendTitle ?? "Send email",
			description:
				dict?.platform?.scopeEmailsSendDescription ??
				"Send messages from connected email addresses.",
		},
		{
			value: "emails:receive",
			icon: Inbox,
			title: dict?.platform?.scopeEmailsReceiveTitle ?? "Receive email",
			description:
				dict?.platform?.scopeEmailsReceiveDescription ??
				"Receive incoming messages for the workspace.",
		},
		{
			value: "templates:read",
			icon: BookOpen,
			title: dict?.platform?.scopeTemplatesReadTitle ?? "Read templates",
			description:
				dict?.platform?.scopeTemplatesReadDescription ??
				"View saved email templates.",
		},
		{
			value: "templates:write",
			icon: FilePenLine,
			title: dict?.platform?.scopeTemplatesWriteTitle ?? "Manage templates",
			description:
				dict?.platform?.scopeTemplatesWriteDescription ??
				"Create and update email templates.",
		},
	] as const;

	return (
		<fieldset>
			<input type="hidden" name={name} value={apiScopeList.join(",")} />
			<div className="flex items-start justify-between gap-4">
				<div>
					<legend className="text-sm font-medium">
						{dict?.platform?.scopes ?? "Scopes"}
					</legend>
					<p className="mt-1 max-w-prose text-sm leading-5 text-muted-foreground">
						{dict?.platform?.apiKeyScopesHint ??
							"This key includes the permissions listed below."}
					</p>
				</div>
				<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
			</div>

			<div className="mt-3 grid rounded-lg bg-muted/35 px-4 sm:grid-cols-2">
				{scopes.map((scope, index) => {
					const Icon = scope.icon;
					return (
						<div
							key={scope.value}
							className={`flex min-w-0 gap-3 py-4 ${index > 0 ? "border-t" : ""} ${index % 2 === 0 ? "sm:pr-4" : "sm:border-l sm:pl-4"} ${index === 1 ? "sm:border-t-0" : ""}`}
						>
							<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
								<Icon className="size-4" />
							</div>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-sm font-medium">{scope.title}</p>
									<code className="rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
										{scope.value}
									</code>
								</div>
								<p className="mt-1 text-sm leading-5 text-muted-foreground">
									{scope.description}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</fieldset>
	);
}

export default function ManageApiKeys({
	apiKeysList,
}: {
	apiKeysList: FetchUserAPIKeysResult;
}) {
	const dict = useOptionalDictionary();

	const handleCopy = (key: string) => {
		void navigator.clipboard.writeText(key);
		toast.info(dict?.platform?.copiedApiKey ?? "Copied API key");
	};

	const fields: FieldConfig[] = [
		{
			name: "ulid",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: ulid() },
		},
		{
			name: "name",
			label: dict?.platform?.keyName ?? "Key Name",
			wrapperClasses: "col-span-12",
			props: { required: true },
		},
		{
			name: "scope",
			kind: "custom",
			component: ApiScopeSummary,
			wrapperClasses: "col-span-12",
		},
	];

	function fmtTemporal(input?: Date | string | null) {
		if (!input) return dict?.platform?.dashDash ?? "-";

		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const instant =
			input instanceof Date
				? Temporal.Instant.fromEpochMilliseconds(input.getTime())
				: Temporal.Instant.from(input);

		return instant.toZonedDateTimeISO(timeZone).toLocaleString(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		});
	}

	return (
		<div className="grid items-start gap-6 2xl:grid-cols-[minmax(20rem,0.72fr)_minmax(44rem,1.28fr)]">
			<Card className="gap-5 shadow-none">
				<CardHeader className="px-4 sm:px-6">
					<CardTitle className="text-base">
						{dict?.platform?.createKey ?? "Create Key"}
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4 sm:px-6">
					<ReusableForm
						action={addApiKey}
						fields={fields}
						submitButtonProps={{
							submitLabel: dict?.platform?.createKey ?? "Create Key",
							wrapperClasses: "mt-6",
							className: "!min-h-11 !w-full sm:!min-h-10",
							fullWidth: true,
						}}
					/>
				</CardContent>
			</Card>

			<Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
				<CardHeader className="flex min-h-16 flex-row items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
					<CardTitle className="text-base">
						{dict?.platform?.apiKeys ?? "API Keys"}
					</CardTitle>
					<Badge variant="light" radius="xl">
						{apiKeysList.length}
					</Badge>
				</CardHeader>

				{apiKeysList.length === 0 ? (
					<DashboardEmptyState
						icon={<KeyRound className="size-5" />}
						title={dict?.platform?.noApiKeysYet ?? "No API keys yet."}
						className="min-h-72 py-10"
					/>
				) : (
					<>
						<CardContent className="space-y-3 px-3 py-3 lg:hidden">
							{apiKeysList.map((key) => (
								<article
									key={key.id}
									className="rounded-lg border bg-muted/10 p-4"
								>
									<div className="min-w-0">
										<h3 className="truncate text-sm font-semibold">
											{key.name}
										</h3>
										<p className="mt-1 text-xs text-muted-foreground">
											{fmtTemporal(key.createdAt)}
										</p>
									</div>

									<dl className="mt-4 space-y-3">
										<div>
											<dt className="text-xs font-medium text-muted-foreground">
												{dict?.platform?.keyId ?? "Key ID"}
											</dt>
											<dd className="mt-1 break-all font-mono text-xs">
												{key.id}
											</dd>
										</div>
										<div>
											<dt className="text-xs font-medium text-muted-foreground">
												{dict?.platform?.scopes ?? "Scopes"}
											</dt>
											<dd className="mt-2">
												<ScopeBadges scopes={key.scopes} />
											</dd>
										</div>
									</dl>

									<Button
										type="button"
										variant="outline"
										className="mt-4 h-11 w-full"
										onClick={() => handleCopy(key.vault.rawKey)}
									>
										<Copy className="size-4" />
										{dict?.platform?.copyApiKey ?? "Copy API Key"}
									</Button>
								</article>
							))}
						</CardContent>

						<div className="hidden overflow-x-auto lg:block">
							<table className="w-full min-w-[48rem] text-sm">
								<thead>
									<tr className="text-left text-xs text-muted-foreground">
										<th className="px-6 py-3 font-medium">
											{dict?.platform?.name ?? "Name"}
										</th>
										<th className="px-6 py-3 font-medium">
											{dict?.platform?.keyId ?? "Key ID"}
										</th>
										<th className="px-6 py-3 font-medium">
											{dict?.platform?.scopes ?? "Scopes"}
										</th>
										<th className="px-6 py-3 font-medium">
											{dict?.platform?.created ?? "Created"}
										</th>
										<th className="px-6 py-3 text-right font-medium">
											{dict?.platform?.actions ?? "Actions"}
										</th>
									</tr>
								</thead>
								<tbody>
									{apiKeysList.map((key) => (
										<tr key={key.id} className="border-t align-top">
											<td className="px-6 py-4 font-medium">{key.name}</td>
											<td className="max-w-56 break-all px-6 py-4 font-mono text-xs">
												{key.id}
											</td>
											<td className="px-6 py-4">
												<ScopeBadges scopes={key.scopes} />
											</td>
											<td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
												{fmtTemporal(key.createdAt)}
											</td>
											<td className="px-6 py-4 text-right">
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="h-9 whitespace-nowrap"
													onClick={() => handleCopy(key.vault.rawKey)}
												>
													<Copy className="size-4" />
													{dict?.platform?.copyApiKey ?? "Copy API Key"}
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
			</Card>
		</div>
	);
}
