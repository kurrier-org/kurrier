"use client";

import React from "react";
import { Trash2, ArrowDownToLine } from "lucide-react";
import { ActionIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
    deleteInboundIdentity,
    FetchInboundIdentitiesResultRow,
} from "@/lib/actions/dashboard";

export default function InboundIdentityCard({
                                                row,
                                            }: {
    row: FetchInboundIdentitiesResultRow;
}) {
    const identity = row.identity;

    const confirmDelete = () =>
        modals.openConfirmModal({
            title: (
                <div className="font-semibold text-brand-foreground">
                    Delete Inbound Identity
                </div>
            ),
            centered: true,
            children: (
                <div className="text-sm">
                    Are you sure you want to delete{" "}
                    <b>{identity.value}</b>?
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
                const { success, error } =
                    await deleteInboundIdentity(identity.id);

                if (success) {
                    toast.success("Inbound identity deleted");
                } else {
                    toast.error(error || "Failed to delete inbound identity");
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
                        Inbound API identity
                    </div>
                </div>

                <ActionIcon
                    color="red"
                    onClick={confirmDelete}
                >
                    <Trash2 className="h-3 w-3" />
                </ActionIcon>
            </div>
        </div>
    );
}
