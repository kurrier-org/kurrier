"use client";

import React from "react";
import { IconTrash } from "@tabler/icons-react";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ContactEntity } from "@db";
import {useRouter} from "next/navigation";

type DeleteContactButtonProps = {
    contact: ContactEntity;
    onDeleteAction: (id: string) => Promise<{ success: boolean }>;
};

function DeleteContactButton({ contact, onDeleteAction }: DeleteContactButtonProps) {

    const router = useRouter()
    const confirmDeleteContact = () => {
        if (!contact.id) return;

        modals.openConfirmModal({
            title: (
                <div className="font-semibold text-brand-foreground">
                    Delete Contact
                </div>
            ),
            centered: true,
            children: (
                <div className="text-sm">
                    Are you sure you want to delete{" "}
                    <b>
                        {contact.firstName} {contact.lastName}
                    </b>
                    ? This will remove the contact permanently.
                </div>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: async () => {
                await onDeleteAction(contact.id);
                router.push("/dashboard/contacts");
            },
        });
    };

    return (
        <Button
            onClick={confirmDeleteContact}
            size="xs"
            leftSection={<IconTrash size={14} stroke={1.5} />}
            variant="light"
        >
            Remove
        </Button>
    );
}

export default DeleteContactButton;
