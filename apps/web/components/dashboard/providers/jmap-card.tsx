"use client";

import * as React from "react";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Mail, Plus } from "lucide-react";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";

import { JMAP_SPEC } from "@schema";

import type {
    FetchJmapAccountsResult,
} from "@/lib/actions/jmap-actions";

import JmapAccountCard from "@/components/dashboard/providers/jmap-account-card";
import JmapConnectForm from "@/components/dashboard/providers/jmap-connect-form";

export default function JmapCard({
                                     jmapAccounts,
                                 }: {
    jmapAccounts: FetchJmapAccountsResult;
}) {
    const openAddModal = () => {
        const modalId = modals.open({
            title: (
                <div className="font-semibold text-brand-foreground">
                    Connect JMAP Account
                </div>
            ),
            closeOnEscape: false,
            closeOnClickOutside: false,
            size: "lg",
            children: (
                <JmapConnectForm
                    onCompleted={() => modals.close(modalId)}
                />
            ),
        });
    };

    return (
        <div className="flex flex-col">
            <Card className="h-full shadow-none border-border">
                <CardHeader className="gap-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-muted-foreground" />

                                <CardTitle className="text-xl">
                                    {JMAP_SPEC.name} (BETA)
                                </CardTitle>
                            </div>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Connect accounts from JMAP-compatible mail providers.
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground/80">
                                {JMAP_SPEC.help}
                            </p>
                        </div>

                        <CardAction className="mt-3 lg:mt-0">
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={openAddModal}
                            >
                                <Plus className="h-4 w-4" />
                                Add JMAP Account
                            </Button>
                        </CardAction>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {(!jmapAccounts || jmapAccounts.length === 0) && (
                        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed bg-muted p-6 text-center text-sm text-muted-foreground">
                            <div>
                                <div className="font-medium text-card-foreground">
                                    No JMAP accounts connected
                                </div>

                                <div className="mt-1 text-xs text-card-foreground">
                                    Connect Fastmail or another JMAP-compatible server.
                                </div>
                            </div>

                            <Button
                                variant="default"
                                size="sm"
                                className="gap-2"
                                onClick={openAddModal}
                            >
                                <Plus className="h-4 w-4" />
                                Add JMAP Account
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {jmapAccounts?.map((account) => (
                            <JmapAccountCard
                                key={account.id}
                                jmapAccount={account}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
