"use client";

import React, { useState } from "react";
import { Checkbox, NumberInput, Select, Switch } from "@mantine/core";
import { ReusableForm } from "@/components/common/reusable-form";
import type { BaseFormProps } from "@schema";
import { ReusableFormItems } from "@/components/common/reusable-form-items";
import { LabelEntity } from "@db";
import {FetchAppLabelsResult} from "@/lib/actions/mail-rules";

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

const SIZE_OP_OPTIONS = [
    { value: "gt", label: "greater than" },
    { value: "lt", label: "less than" },
] as const;

const SIZE_UNIT_OPTIONS = [
    { value: "KB", label: "KB" },
    { value: "MB", label: "MB" },
] as const;

export default function CreateRuleFormGmailV1({ action, identityId, appLabels, initialName = "New rule"}: { action: any; identityId: string; appLabels: FetchAppLabelsResult, initialName?: string; }) {
    const [applyLabel, setApplyLabel] = useState(false);

    const criteriaFields: BaseFormProps["fields"] = [
        {
            name: "from",
            label: "From",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: "e.g. newsletter@company.com",
                autoComplete: "off",
            },
        },
        {
            name: "to",
            label: "To",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: "e.g. me@domain.com",
                autoComplete: "off",
            },
        },
        {
            name: "subject",
            label: "Subject",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: "e.g. invoice",
                autoComplete: "off",
            },
        },
        {
            name: "hasWords",
            label: "Has the words",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: "e.g. unsubscribe",
                autoComplete: "off",
            },
        },
        {
            name: "doesntHave",
            label: "Doesn't have",
            wrapperClasses: "col-span-12 md:col-span-6",
            props: {
                defaultValue: "",
                placeholder: "e.g. urgent",
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
                label: <div className="text-sm -mt-1">Has attachment</div>,
            },
        },
    ];

    const sizeFields: BaseFormProps["fields"] = [
        {
            name: "sizeOp",
            label: "Operator",
            kind: "select",
            wrapperClasses: "col-span-12 md:col-span-4",
            options: SIZE_OP_OPTIONS as any,
            props: {
                defaultValue: "gt",
            },
        },
        {
            name: "sizeValue",
            label: "Value",
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
            label: "Unit",
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
            label: "Mark as read",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2",
            props: {
                defaultChecked: false,
                label: <div className="text-sm">Mark as read</div>,
            },
        },
        {
            name: "flag",
            label: "Star it (Flag)",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2",
            props: {
                defaultChecked: false,
                label: <div className="text-sm">Star it (Flag)</div>,
            },
        },
        {
            name: "trash",
            label: "Delete it (Trash)",
            kind: "custom",
            component: BoolCheckbox,
            wrapperClasses:
                "col-span-12 md:col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2",
            props: {
                defaultChecked: false,
                label: <div className="text-sm">Delete it (Trash)</div>,
            },
        },
        {
            name: "applyLabel",
            label: "Apply label",
            kind: "custom",
            component: BoolCheckboxControlled,
            wrapperClasses:
                "col-span-6 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3",
            props: {
                checked: applyLabel,
                onChange: (e: any) => setApplyLabel(e.currentTarget.checked),
                label: <div className="text-sm">Apply label</div>,
            },
        },
        ...(applyLabel
            ? ([
                {
                    name: "labelId",
                    label: "Label Name",
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
            label: "Rule name",
            wrapperClasses: "col-span-12 md:col-span-7",
            props: {
                required: true,
                placeholder: "e.g. Newsletters",
                defaultValue: initialName,
                autoComplete: "off",
            },
        },
        {
            name: "priority",
            label: "Priority",
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
            label: "Enabled",
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
                    <div className="text-sm font-semibold">Criteria</div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Messages must match all filled fields.
                    </div>

                    <ReusableFormItems
                        formWrapperClasses="mt-4 grid grid-cols-12 gap-3"
                        fields={criteriaFields}
                    />

                    <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
                        <div className="text-sm font-medium">Size</div>
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
                    <div className="text-sm font-semibold">Actions</div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        What to do when a message matches.
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
                submitLabel: "Create rule",
                wrapperClasses: "mt-4 flex justify-start py-4",
                fullWidth: false,
            }}
            formWrapperClasses="grid grid-cols-12 gap-4"
        />
    );
}
