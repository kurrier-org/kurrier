"use client";

import { Badge, Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { JMAP_PRESETS, type JmapPresetKey } from "@schema";
import { KeyRound, Mail, Play, ShieldCheck } from "lucide-react";
import * as React from "react";
import JmapConnectForm from "@/components/dashboard/providers/jmap-connect-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import type { FetchJmapAccountsResult } from "@/lib/actions/jmap-actions";
import { cn } from "@/lib/utils";

type JmapAccount = FetchJmapAccountsResult[number];

export default function JmapAccountCard({
	jmapAccount,
}: {
	jmapAccount: JmapAccount;
}) {
	const dict = useOptionalDictionary();
	const preset =
		jmapAccount.preset && JMAP_PRESETS[jmapAccount.preset as JmapPresetKey];

	const providerName =
		preset?.name ?? dict?.platform?.customJmapProviderName ?? "Custom JMAP";
	const updateTokenLabel = dict?.platform?.updateToken ?? "Update Token";

	const openUpdateToken = () => {
		if (!jmapAccount.preset) return;

		const modalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{(dict?.platform?.updateTokenPrefix ?? "Update ") +
						providerName +
						(dict?.platform?.updateTokenSuffix ?? " Token")}
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<JmapConnectForm
					presetKey={jmapAccount.preset as JmapPresetKey}
					submitLabel={updateTokenLabel}
					jmapAccountId={jmapAccount?.id}
					successMessage={
						dict?.platform?.jmapTokenUpdatedToast ?? "JMAP token updated"
					}
					onCompleted={() => modals.close(modalId)}
				/>
			),
		});
	};

	return (
		<div
			className={cn(
				"col-span-12",
				"rounded-lg border bg-card p-5 text-brand-foreground border-border",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
							<Mail className="size-4" />
						</div>

						<div className="min-w-0">
							<div className="truncate text-base font-medium">
								{jmapAccount.username}
							</div>

							<div className="truncate text-sm text-muted-foreground">
								{providerName}
							</div>
						</div>
					</div>

					<div className="mt-4 flex flex-wrap items-center gap-2">
						<Badge size="sm" variant="light" color="green">
							{dict?.platform?.jmapConnectedBadge ?? "Connected"}
						</Badge>

						<Badge size="sm" variant="light" color="violet">
							JMAP
						</Badge>
					</div>

					<div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
						<ShieldCheck className="h-3.5 w-3.5" />
						{dict?.platform?.jmapConnectedHelp ?? "JMAP connected"}
					</div>

					<div className="mt-2 text-xs text-muted-foreground">
						{dict?.platform?.jmapAccountIdPrefix ?? "Account ID: "}
						{jmapAccount.accountId}
					</div>

					<div className="my-3 flex flex-wrap gap-2">
						{jmapAccount.preset && (
							<Button
								leftSection={<KeyRound className="size-4" />}
								size="xs"
								variant="filled"
								onClick={openUpdateToken}
							>
								{updateTokenLabel}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
