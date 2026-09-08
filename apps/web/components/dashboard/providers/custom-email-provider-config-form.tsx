"use client";

import { Switch } from "@mantine/core";
import type { FieldConfig } from "@schema";

import { ReusableForm } from "@/components/common/reusable-form";
import { saveCustomEmailProvider } from "@/lib/actions/dashboard";

export default function CustomEmailProviderConfigForm({
                                                          onCompleted,
                                                      }: {
    onCompleted?: () => void;
}) {
    const fields: FieldConfig[] = [
        {
            name: "name",
            label: "Provider name",
            wrapperClasses: "col-span-12",
            props: {
                required: true,
                placeholder: "Company Mail",
            },
        },
        {
            name: "description",
            label: "Description",
            wrapperClasses: "col-span-12",
            props: {
                placeholder: "Corporate email",
            },
        },
        {
            name: "credentialMode",
            label: "Credentials",
            kind: "select",
            wrapperClasses: "col-span-12",
            options: [
                {
                    label: "Same login for SMTP and IMAP",
                    value: "shared",
                },
                {
                    label: "Separate SMTP and IMAP logins",
                    value: "separate",
                },
            ],
            props: {
                defaultValue: "shared",
            },
        },
        {
            el: (
                <div className="col-span-12 border-t pt-4">
                    <p className="text-sm font-medium">Outgoing mail (SMTP)</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Server settings used to send email.
                    </p>
                </div>
            ),
        },
        {
            name: "smtpHost",
            label: "SMTP host",
            wrapperClasses: "col-span-8",
            props: {
                required: true,
                placeholder: "mail.example.com",
            },
        },
        {
            name: "smtpPort",
            label: "Port",
            wrapperClasses: "col-span-4",
            props: {
                type: "number",
                required: true,
                defaultValue: 465,
            },
        },
        {
            name: "smtpSecure",
            label: "Use TLS",
            kind: "custom",
            wrapperClasses: "col-span-6",
            component: Switch,
            props: {
                defaultChecked: true,
                value: "true",
            },
        },
        {
            name: "smtpPool",
            label: "Connection pooling",
            kind: "custom",
            wrapperClasses: "col-span-6",
            component: Switch,
            props: {
                value: "true",
            },
        },
        {
            el: (
                <div className="col-span-12 border-t pt-4">
                    <p className="text-sm font-medium">Incoming mail (IMAP)</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Optional. Configure this to allow mailbox synchronization.
                    </p>
                </div>
            ),
        },
        {
            name: "imapHost",
            label: "IMAP host",
            wrapperClasses: "col-span-8",
            props: {
                placeholder: "mail.example.com",
            },
        },
        {
            name: "imapPort",
            label: "Port",
            wrapperClasses: "col-span-4",
            props: {
                type: "number",
                defaultValue: 993,
            },
        },
        {
            name: "imapSecure",
            label: "Use TLS",
            kind: "custom",
            wrapperClasses: "col-span-12",
            component: Switch,
            props: {
                defaultChecked: true,
                value: "true",
            },
        },
    ];

    return (
        <ReusableForm
            action={saveCustomEmailProvider}
            fields={fields}
            onSuccess={onCompleted}
            notify={{ kind: "toast" }}
            submitButtonProps={{
                submitLabel: "Add email provider",
                wrapperClasses: "mt-6",
                fullWidth: true,
            }}
        />
    );
}
