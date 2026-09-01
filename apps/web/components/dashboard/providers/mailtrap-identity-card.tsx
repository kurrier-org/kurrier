"use client";

import { ActionIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ArrowDownToLine, Trash2 } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import {
	deleteProviderIdentity,
	type FetchProviderIdentitiesResultRow,
} from "@/lib/actions/dashboard";
import { cn } from "@/lib/utils";

export default function MailtrapIdentityCard({
	row,
}: {
	row: FetchProviderIdentitiesResultRow;
}) {
	const identity = row.identity;

	const confirmDelete = () =>
		modals.openConfirmModal({
			title: (
				<div className="font-semibold text-brand-foreground">
					Delete Mailtrap Identity
				</div>
			),
			centered: true,
			children: (
				<div className="text-sm">
					Are you sure you want to delete <b>{identity.value}</b>?
				</div>
			),
			labels: {
				confirm: "Delete",
				cancel: "Cancel",
			},
			confirmProps: {
				color: "red",
			},
			onConfirm: async () => {
				const { success, error } = await deleteProviderIdentity(
					identity.id,
					"mailtrap",
				);

				if (success) {
					toast.success("Mailtrap identity deleted");
				} else {
					toast.error(error || "Failed to delete Mailtrap identity");
				}
			},
		});

	return (
		<div
			className={cn(
				"rounded-lg border text-brand-foreground p-5 bg-card border-border",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-base font-medium">
						{identity.displayName || identity.value}
					</div>

					<div className="mt-1 text-sm flex items-center gap-2 text-muted-foreground">
						<ArrowDownToLine className="h-3.5 w-3.5" />
						<code>{identity.value}</code>
					</div>

					<div className="mt-2 text-xs text-muted-foreground">
						Mailtrap inbound identity
					</div>
				</div>

				<ActionIcon color="red" onClick={confirmDelete}>
					<Trash2 className="h-3 w-3" />
				</ActionIcon>
			</div>
		</div>
	);
}
