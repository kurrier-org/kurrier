"use client";
import React from 'react';
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import {IdentityEntity} from "@db";
import {ReusableForm} from "@/components/common/reusable-form";
import {FormState} from "@schema";
import {usePathname} from "next/navigation";

type UpdateNameAction = (_prev: FormState, formData: FormData) => Promise<FormState>;

function SettingsGeneral({ updateName, identity }: {updateName: UpdateNameAction, identity: IdentityEntity}) {

    const pathname = usePathname()

    const fields = [
        {
            name: "displayName",
            label: "Display Name",
            wrapperClasses: "col-span-6",
            props: {
                defaultValue: identity.displayName,
                required: true,
            },
        },
        {
            name: "value",
            label: "Email",
            wrapperClasses: "col-span-6",
            props: {
                defaultValue: identity.value,
                readOnly: true,
                disabled: true,
            },
        },
        {
            name: "id",
            wrapperClasses: "hidden",
            props: { hidden: true, defaultValue: identity.id },
        },
        {
            name: "pathname",
            wrapperClasses: "hidden",
            props: { hidden: true, defaultValue: pathname },
        }
    ];

    return <>
        <SectionCard
            title="Identity details"
            description="Basic info used across the webmail UI."
        >

            <ReusableForm
                fields={fields}
                action={updateName}
                submitButtonProps={{
                    wrapperClasses: "flex items-center justify-end my-4 py-3",
                    submitLabel: "Save changes",
                }}
            />

        </SectionCard>

    </>
}

export default SettingsGeneral;
