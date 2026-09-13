"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { Plus } from "lucide-react";

import CustomEmailProviderConfigForm from "@/components/dashboard/providers/custom-email-provider-config-form";

export default function AddCustomEmailProviderButton() {
    const openModal = () => {
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
                    <CustomEmailProviderConfigForm
                        onCompleted={() => modals.closeAll()}
                    />
                </div>
            ),
        });
    };

    return (
        <Button
            size="xs"
            leftSection={<Plus className="size-4" />}
            onClick={openModal}
        >
            Add email provider
        </Button>
    );
}
