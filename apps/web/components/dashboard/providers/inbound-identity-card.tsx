"use client";

import { ActionIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ArrowDownToLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { responsiveModalActionsClassName } from "@/components/common/modal-actions";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	deleteInboundIdentity,
	type FetchInboundIdentitiesResultRow,
} from "@/lib/actions/dashboard";
import { cn } from "@/lib/utils";

export default function InboundIdentityCard({
	row,
}: {
	row: FetchInboundIdentitiesResultRow;
}) {
	const dict = useOptionalDictionary();
	const identity = row.identity;

	const confirmDelete = () =>
		modals.openConfirmModal({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.platform?.deleteInboundIdentity ?? "Delete Inbound Identity"}
				</div>
			),
			centered: true,
			children: (
				<div className="text-sm">
					{dict?.platform?.confirmDeleteInboundIdentityPrefix ??
						"Are you sure you want to delete "}
					<b>{identity.value}</b>
					{dict?.platform?.confirmDeleteInboundIdentitySuffix ?? "?"}
				</div>
			),
			labels: {
				confirm: dict?.common?.delete ?? "Delete",
				cancel: dict?.common?.cancel ?? "Cancel",
			},
			confirmProps: {
				color: "red",
			},
			groupProps: { className: responsiveModalActionsClassName },
			onConfirm: async () => {
				const { success, error } = await deleteInboundIdentity(identity.id);

				if (success) {
					toast.success(
						dict?.platform?.inboundIdentityDeletedToast ??
							"Inbound identity deleted",
					);
				} else {
					toast.error(
						error ||
							dict?.platform?.failedToDeleteInboundIdentity ||
							"Failed to delete inbound identity",
					);
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
						{dict?.platform?.inboundApiIdentity ?? "Inbound API identity"}
					</div>
				</div>

				<ActionIcon color="red" onClick={confirmDelete}>
					<Trash2 className="h-3 w-3" />
				</ActionIcon>
			</div>
		</div>
	);
}
