"use client";

import React, { useState } from "react";
import { Checkbox, NumberInput, Select, Switch } from "@mantine/core";
import { ReusableForm } from "@/components/common/reusable-form";
import type { BaseFormProps } from "@schema";
import { ReusableFormItems } from "@/components/common/reusable-form-items";
import { LabelEntity } from "@db";
import {FetchAppLabelsResult} from "@/lib/actions/mail-rules";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

type BoolSwitchProps = {
    name: string;
    defaultChecked?: boolean;
    size?: any;
    label?: React.ReactNode;
    onChange?: (e: any) => void;
};

function BoolSwitch(props: BoolSwitchProps) {
    const { name, defaultChecked = false, onChange, ...rest } = props;
    const [checked, setChecked] = useState<boolean>(defaultChecked);

    return (
        <>
            <input
                type="hidden"
                name={name}
                value={checked ? "true" : "false"}
                readOnly
            />
            <Switch
                checked={checked}
                onChange={(e) => {
                    setChecked(e.currentTarget.checked);
                    onChange?.(e);
                }}
                {...rest}
            />
        </>
    );
}

type BoolCheckboxProps = {
    name: string;
    defaultChecked?: boolean;
    label?: React.ReactNode;
    onChange?: (e: any) => void;
};

function BoolCheckbox(props: BoolCheckboxProps) {
    const { name, defaultChecked = false, onChange, label } = props;
    const [checked, setChecked] = useState<boolean>(defaultChecked);

    return (
        <>
            <input
                type="hidden"
                name={name}
                value={checked ? "true" : "false"}
                readOnly
            />
            <Checkbox
                checked={checked}
                size={"xs"}
                onChange={(e) => {
                    setChecked(e.currentTarget.checked);
                    onChange?.(e);
                }}
                label={label}
            />
        </>
    );
}

type BoolCheckboxControlledProps = {
    name: string;
    checked: boolean;
    onChange: (e: any) => void;
    label?: React.ReactNode;
};

function BoolCheckboxControlled({
                                    name,
                                    checked,
                                    onChange,
                                    label,
                                }: BoolCheckboxControlledProps) {
    return (
        <>
            <input
                type="hidden"
                name={name}
                value={checked ? "true" : "false"}
                readOnly
            />
            <Checkbox size={"xs"} checked={checked} onChange={onChange} label={label} />
        </>
    );
}

export default function CreateRuleFormGmailV1({ action, identityId, appLabels, initialName}: { action: any; identityId: string; appLabels: FetchAppLabelsResult, initialName?: string; }) {
    const dict = useOptionalDictionary();
    const [applyLabel, setApplyLabel] = useState(false);
    const resolvedInitialName = initialName ?? (dict?.mailbox?.newRule ?? "New rule");

    const SIZE_OP_OPTIONS = [
        { value: "gt", label: dict?.mailbox?.greaterThan ?? "greater than" },
        { value: "lt", label: dict?.mailbox?.lessThan ?? "less than" },
    ] as const;

    const SIZE_UNIT_OPTIONS = [
        { value: "KB", label: "KB" },
        { value: "MB", label: "MB" },
    ] as const;

    const criteriaFields: BaseFormProps["fields"] = [
        {
            name: "from",
            label: dict?.mailbox?.from ?? "From",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: dict?.mailbox?.fromPlaceholder ?? "e.g. newsletter@company.com",
                autoComplete: "off",
            },
        },
        {
            name: "to",
            label: dict?.mailbox?.to ?? "To",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: dict?.mailbox?.toPlaceholder ?? "e.g. me@domain.com",
                autoComplete: "off",
            },
        },
        {
            name: "subject",
            label: dict?.mailbox?.subject ?? "Subject",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: dict?.mailbox?.subjectPlaceholder ?? "e.g. invoice",
                autoComplete: "off",
            },
        },
        {
            name: "hasWords",
            label: dict?.mailbox?.hasTheWords ?? "Has the words",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: dict?.mailbox?.hasTheWordsPlaceholder ?? "e.g. unsubscribe",
                autoComplete: "off",
            },
        },
        {
            name: "doesntHave",
            label: dict?.mailbox?.doesntHave ?? "Doesn't have",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: dict?.mailbox?.doesntHavePlaceholder ?? "e.g. urgent",
                autoComplete: "off",
            },
        },
        {
            name: "hasAttachment",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 flex items-center gap-2 justify-end-safe flex-row flex-row-reverse mt-3",
            props: {
                defaultChecked: false,
                label: <div className="text-sm -mt-1">{dict?.mailbox?.hasAttachment ?? "Has attachment"}</div>,
            },
        },
    ];

    const sizeFields: BaseFormProps["fields"] = [
        {
            name: "sizeOp",
            label: dict?.mailbox?.operator ?? "Operator",
            kind: "select",
            wrapperClasses: "col-span-12 md:col-span-4",
            options: SIZE_OP_OPTIONS as any,
            props: {
                defaultValue: "gt",
            },
        },
        {
            name: "sizeValue",
            label: dict?.mailbox?.value ?? "Value",
            kind: "custom",
            component: NumberInput,
            wrapperClasses: "col-span-12 md:col-span-4",
            props: {
                defaultValue: 0,
                min: 0,
                step: 1,
            },
        },
        {
            name: "sizeUnit",
            label: dict?.mailbox?.unit ?? "Unit",
            kind: "select",
            wrapperClasses: "col-span-12 md:col-span-4",
            options: SIZE_UNIT_OPTIONS as any,
            props: {
                defaultValue: "MB",
            },
        },
    ];

    const actionFields: BaseFormProps["fields"] = [
        {
            name: "markRead",
            label: dict?.mailbox?.markAsRead ?? "Mark as read",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2",
            props: {
                defaultChecked: false,
                label: <div className="text-sm">{dict?.mailbox?.markAsRead ?? "Mark as read"}</div>,
            },
        },
        {
            name: "flag",
            label: dict?.mailbox?.starItFlag ?? "Star it (Flag)",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2",
            props: {
                defaultChecked: false,
                label: <div className="text-sm">{dict?.mailbox?.starItFlag ?? "Star it (Flag)"}</div>,
            },
        },
        {
            name: "trash",
            label: dict?.mailbox?.deleteItTrash ?? "Delete it (Trash)",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2",
            props: {
                defaultChecked: false,
                label: <div className="text-sm">{dict?.mailbox?.deleteItTrash ?? "Delete it (Trash)"}</div>,
            },
        },
        {
            name: "applyLabel",
            label: dict?.mailbox?.applyLabel ?? "Apply label",
            kind: "custom",
            component: BoolCheckboxControlled,
            wrapperClasses:
                "col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3",
            props: {
                checked: applyLabel,
                onChange: (e: any) => setApplyLabel(e.currentTarget.checked),
                label: <div className="text-sm">{dict?.mailbox?.applyLabel ?? "Apply label"}</div>,
            },
        },
        ...(applyLabel
            ? ([
                {
                    name: "labelId",
                    label: dict?.mailbox?.labelName ?? "Label Name",
                    kind: "custom",
                    component: Select,
                    wrapperClasses: "col-span-12",
                    props: {
                        data: appLabels.map((label) => ({
                            value: label.id,
                            label: label.name,
                        })),
                        allowDeselect: false,
                        defaultValue: appLabels[0]?.id || "",
                        required: true,
                    },
                }
            ] as BaseFormProps["fields"])
            : [
                {
                    name: "labelId",
                    wrapperClasses: "hidden",
                    props: { type: "hidden", value: "", readOnly: true },
                },
            ]),
    ];

    const fields: BaseFormProps["fields"] = [
        {
            name: "identityId",
            wrapperClasses: "hidden",
            props: { type: "hidden", value: identityId, readOnly: true },
        },
        {
            name: "name",
            label: dict?.mailbox?.ruleName ?? "Rule name",
            wrapperClasses: "col-span-12 md:col-span-7",
            props: {
                required: true,
                placeholder: dict?.mailbox?.ruleNamePlaceholder ?? "e.g. Newsletters",
                defaultValue: resolvedInitialName,
                autoComplete: "off",
            },
        },
        {
            name: "priority",
            label: dict?.mailbox?.priority ?? "Priority",
            kind: "custom",
            component: NumberInput,
            wrapperClasses: "col-span-12 md:col-span-3",
            props: {
                defaultValue: 100,
                min: 0,
                step: 10,
            },
        },
        {
            name: "enabled",
            label: dict?.mailbox?.enabled ?? "Enabled",
            kind: "custom",
            component: BoolSwitch,
            wrapperClasses: "col-span-12 md:col-span-2 flex items-end justify-end gap-2 flex-col",
            props: {
                defaultChecked: true,
                size: "sm",
            },
        },
        {
            el: (
                <div className="col-span-12 mt-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="text-sm font-semibold">{dict?.mailbox?.criteria ?? "Criteria"}</div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        {dict?.mailbox?.criteriaHelp ?? "Messages must match all filled fields."}
                    </div>

                    <ReusableFormItems
                        formWrapperClasses="mt-4 grid grid-cols-12 gap-3"
                        fields={criteriaFields}
                    />

                    <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
                        <div className="text-sm font-medium">{dict?.mailbox?.size ?? "Size"}</div>
                        <ReusableFormItems
                            formWrapperClasses="mt-3 grid grid-cols-12 gap-3"
                            fields={sizeFields}
                        />
                    </div>
                </div>
            ),
        },
        {
            el: (
                <div className="col-span-12 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="text-sm font-semibold">{dict?.mailbox?.actions ?? "Actions"}</div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        {dict?.mailbox?.actionsHelp ?? "What to do when a message matches."}
                    </div>

                    <ReusableFormItems
                        formWrapperClasses="mt-4 grid grid-cols-12 gap-3"
                        fields={actionFields}
                    />
                </div>
            ),
        },
    ];

    return (
        <ReusableForm
            action={action}
            fields={fields}
            submitButtonProps={{
                submitLabel: dict?.mailbox?.createRule ?? "Create rule",
                wrapperClasses: "mt-4 flex justify-start py-4",
                fullWidth: false,
            }}
            formWrapperClasses="grid grid-cols-12 gap-4"
        />
    );
}
