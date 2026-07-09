"use client";
import React from "react";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { IdentityEntity } from "@db";
import { ReusableForm } from "@/components/common/reusable-form";
import { FormState, imapQuotaList, defaultImapQuota } from "@schema";
import { usePathname } from "next/navigation";

type UpdateDailyQuotaAction = (_prev: FormState, formData: FormData) => Promise<FormState>;

function SettingsQuota({ updateDailyQuota, identity }: {updateDailyQuota: UpdateDailyQuotaAction, identity: IdentityEntity}) {

    const pathname = usePathname()
    const currentQuota = Number(identity.metaData?.dailyQuota) || defaultImapQuota;

    const fields = [
        {
            name: "dailyQuota",
            label: "Daily IMAP quota",
            labelSuffix: "Used for backfilling older mails",
            kind: "select" as const,
            options: imapQuotaList.map((quota) => {
                return {
                    label: quota.label,
                    value: String(quota.value),
                };
            }),
            wrapperClasses: "col-span-12",
            props: {
                defaultValue: String(currentQuota),
                className: "w-full",
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
        },
    ];

    return <>
        <SectionCard
            title="Daily IMAP quota"
            description="Limit how much mail is backfilled from the server each day."
        >

            <ReusableForm
                fields={fields}
                action={updateDailyQuota}
                submitButtonProps={{
                    wrapperClasses: "flex items-center justify-end my-4 py-3",
                    submitLabel: "Save changes",
                }}
            />

        </SectionCard>
    </>
}

export default SettingsQuota;
