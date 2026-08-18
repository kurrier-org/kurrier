"use client";

import { INBOUND_SPEC } from "@schema";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowDownToLine, Plus } from "lucide-react";
import * as React from "react";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";

import NewInboundIdentityForm from "@/components/dashboard/providers/new-inbound-identity-form";
import InboundIdentityCard from "@/components/dashboard/providers/inbound-identity-card";
import { FetchInboundIdentitiesResult } from "@/lib/actions/dashboard";

export default function InboundCard({
                                        inboundIdentities,
                                    }: {
    inboundIdentities: FetchInboundIdentitiesResult;
}) {
    const openAddModal = () => {
        const openModalId = modals.open({
            title: (
                <div className="font-semibold text-brand-foreground">
                    Create Inbound Identity
                </div>
            ),
            closeOnEscape: false,
            closeOnClickOutside: false,
            size: "lg",
            children: (
                <div className="p-2">
                    <NewInboundIdentityForm
                        onCompleted={() => modals.close(openModalId)}
                    />
                </div>
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
                                <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-xl">
                                    {INBOUND_SPEC.name}
                                </CardTitle>
                            </div>

                            <p className="text-sm text-muted-foreground mt-1">
                                Receive raw email directly into Kurrier.
                            </p>

                            <p className="text-xs text-muted-foreground/80 mt-1">
                                {INBOUND_SPEC.help}
                            </p>
                        </div>

                        <CardAction className="mt-3 lg:mt-0">
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={openAddModal}
                            >
                                <Plus className="h-4 w-4" />
                                Create Identity
                            </Button>
                        </CardAction>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {(!inboundIdentities ||
                        inboundIdentities.length === 0) && (
                        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-4 bg-muted">
                            <div>
                                <div className="font-medium text-card-foreground">
                                    No inbound identities yet
                                </div>

                                <div className="text-xs text-card-foreground mt-1">
                                    Create an identity to receive RFC822/EML messages
                                    through the Kurrier API.
                                </div>
                            </div>

                            <Button
                                variant="default"
                                size="sm"
                                className="gap-2"
                                onClick={openAddModal}
                            >
                                <Plus className="h-4 w-4" />
                                Create Inbound Identity
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {inboundIdentities?.map((row) => (
                            <InboundIdentityCard
                                key={row.identity.id}
                                row={row}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
