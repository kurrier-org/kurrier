"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { CustomEmailProvider } from "@schema";
import { Plus } from "lucide-react";

import CustomEmailProviderCard from "@/components/dashboard/providers/custom-email-provider-card";

export default function CustomEmailProvidersSection({
                                                        providers,
                                                    }: {
    providers: CustomEmailProvider[];
}) {
    const openAddModal = () => {
        modals.open({
            title: (
                <div className="font-semibold text-brand-foreground">
                    Add email provider
                </div>
            ),
            size: "lg",
            closeOnEscape: false,
            closeOnClickOutside: false,
            children: (
                <div className="p-2">
                    <p className="text-sm text-muted-foreground">
                        Provider configuration form goes here.
                    </p>
                </div>
            ),
        });
    };

    return (
        <section className="mb-8">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                        Configured email providers
                    </h2>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Set up reusable SMTP and IMAP servers for this workspace.
                    </p>
                </div>

                <Button
                    size="xs"
                    leftSection={<Plus className="size-4" />}
                    onClick={openAddModal}
                >
                    Add email provider
                </Button>
            </div>

            {providers.length > 0 ? (
                <div className="grid gap-6">
                    {providers.map((provider) => (
                        <CustomEmailProviderCard
                            key={provider.id}
                            provider={provider}
                        />
                    ))}
                </div>
            ) : (
                <div className="rounded-lg border px-5 py-4">
                    <p className="text-sm font-medium text-foreground">
                        No configured providers yet
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Add a provider to let workspace members connect mailboxes using
                        preconfigured server settings.
                    </p>
                </div>
            )}
        </section>
    );
}
