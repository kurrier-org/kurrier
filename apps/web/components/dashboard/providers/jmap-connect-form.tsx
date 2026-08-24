"use client";

import * as React from "react";
import { PasswordInput, Select } from "@mantine/core";

import {
    JMAP_PRESETS,
    type JmapPresetKey,
} from "@schema";

import {
    connectJmap,
    updateJmapToken,
} from "@/lib/actions/jmap-actions";

import { ReusableForm } from "@/components/common/reusable-form";

export default function JmapConnectForm({
                                            onCompleted,
                                            jmapAccountId,
                                            presetKey,
                                            submitLabel,
                                            successMessage,
                                        }: {
    onCompleted: () => void;
    jmapAccountId?: string;
    presetKey?: JmapPresetKey;
    submitLabel?: string;
    successMessage?: string;
}) {
    const isUpdate = !!jmapAccountId;

    const presetOptions = Object.values(JMAP_PRESETS).map((preset) => ({
        value: preset.key,
        label: preset.name,
    }));

    const fields = [
        ...(isUpdate
            ? [
                {
                    name: "jmapAccountId",
                    wrapperClasses: "hidden",
                    props: {
                        type: "hidden",
                        hidden: true,
                        defaultValue: jmapAccountId,
                    },
                },
            ]
            : [
                {
                    name: "preset",
                    label: "Provider",
                    kind: "custom" as const,
                    component: Select,
                    wrapperClasses: "col-span-12",
                    props: {
                        required: true,
                        data: presetOptions,
                        allowDeselect: false,
                        defaultValue: presetKey ?? "fastmail",
                        description: "Choose a known JMAP provider.",
                    },
                },
            ]),
        {
            name: "token",
            label: "API token",
            kind: "custom" as const,
            component: PasswordInput,
            wrapperClasses: "col-span-12",
            props: {
                required: true,
                placeholder: "Paste API token",
                description: isUpdate
                    ? "Enter a new API token for this JMAP account."
                    : "Use an API token with JMAP Mail and Submission access.",
            },
        },
    ];

    return (
        <div className="p-2">
            <ReusableForm
                action={isUpdate ? updateJmapToken : connectJmap}
                fields={fields}
                onSuccess={onCompleted}
                notify={{
                    kind: "toast",
                    successMessage:
                        successMessage ??
                        (isUpdate
                            ? "JMAP token updated"
                            : "JMAP account connected"),
                }}
                submitButtonProps={{
                    submitLabel:
                        submitLabel ??
                        (isUpdate ? "Update Token" : "Connect"),
                    wrapperClasses: "mt-6 inline-flex",
                }}
            />
        </div>
    );
}
