"use client";

import React, { useMemo, useState } from "react";
import { Button, Select, Switch, TextInput } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { ReusableForm } from "@/components/common/reusable-form";
import { createMailRuleV1 } from "@/lib/actions/mail-rules";

type Logic = "all" | "any";

type Field =
    | "from"
    | "to"
    | "cc"
    | "bcc"
    | "reply_to"
    | "subject"
    | "text"
    | "snippet"
    | "list_id"
    | "subscription_key"
    | "has_attachments"
    | "size_bytes";

type Op =
    | "exists"
    | "not_exists"
    | "eq"
    | "not_eq"
    | "contains"
    | "not_contains"
    | "starts_with"
    | "ends_with"
    | "regex"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "not_in";

type ActionType =
    | "mark_read"
    | "mark_unread"
    | "flag"
    | "unflag"
    | "add_label"
    | "remove_label"
    | "move_to_mailbox"
    | "archive"
    | "trash";

type ConditionDraft = { field: Field; op: Op; value?: string };
type ActionDraft = {
    actionType: ActionType;
    labelId?: string;
    mailboxId?: string;
};

function needsValue(op: Op) {
    return !["exists", "not_exists"].includes(op);
}

function isBooleanField(field: Field) {
    return field === "has_attachments";
}

function isNumericField(field: Field) {
    return field === "size_bytes";
}

function RuleCreateV1() {
    const pathname = usePathname();
    const router = useRouter();

    const [name, setName] = useState("New rule");
    const [enabled, setEnabled] = useState(true);
    const [priority, setPriority] = useState<number>(100);
    const [stopProcessing, setStopProcessing] = useState(false);
    const [logic, setLogic] = useState<Logic>("all");

    const [conditions, setConditions] = useState<ConditionDraft[]>([
        { field: "from", op: "contains", value: "" },
    ]);

    const [actions, setActions] = useState<ActionDraft[]>([
        { actionType: "add_label" },
    ]);

    const payload = useMemo(() => {
        const normalizedConditions = conditions
            .map((c) => {
                const v = (c.value ?? "").trim();
                const keepValue = needsValue(c.op) && !isBooleanField(c.field);
                if (!keepValue) return { field: c.field, op: c.op };
                if (isNumericField(c.field)) return { field: c.field, op: c.op, value: v };
                return { field: c.field, op: c.op, value: v };
            })
            .filter((c) => {
                if (!("value" in c)) return true;
                return String((c as any).value ?? "").length > 0;
            });

        const normalizedActions = actions.map((a, idx) => ({
            order: idx,
            actionType: a.actionType,
            params:
                a.actionType === "add_label" || a.actionType === "remove_label"
                    ? { labelId: a.labelId }
                    : a.actionType === "move_to_mailbox"
                        ? { mailboxId: a.mailboxId }
                        : null,
        }));

        return JSON.stringify({
            name,
            enabled,
            priority,
            stopProcessing,
            match: { version: 1, logic, conditions: normalizedConditions },
            actions: normalizedActions,
        });
    }, [actions, conditions, enabled, logic, name, priority, stopProcessing]);

    return (
        <SectionCard
            title="Create rule"
            description="Match incoming messages and run actions."
            footer={
                <div className="flex items-center justify-between gap-3">
                    <Button variant="default" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    {/*<ReusableForm*/}
                    {/*    action={createMailRuleV1}*/}
                    {/*    onCompleted={() => router.back()}*/}
                    {/*    submitLabel="Save rule"*/}
                    {/*    extraInputs={*/}
                    {/*        <>*/}
                    {/*            <input type="hidden" name="pathname" value={pathname} />*/}
                    {/*            <input type="hidden" name="payload" value={payload} />*/}
                    {/*        </>*/}
                    {/*    }*/}
                    {/*/>*/}
                </div>
            }
        >
            <div className="space-y-8">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-6">
                        <TextInput label="Rule name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                        <TextInput
                            label="Priority"
                            value={String(priority)}
                            onChange={(e) => setPriority(Number(e.currentTarget.value || 0))}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-3 flex items-end">
                        <Switch
                            label="Enabled"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.currentTarget.checked)}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                        <Select
                            label="Match logic"
                            value={logic}
                            onChange={(v) => setLogic((v as Logic) ?? "all")}
                            data={[
                                { value: "all", label: "Match all conditions" },
                                { value: "any", label: "Match any condition" },
                            ]}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-6 flex items-end">
                        <Switch
                            label="Stop processing after this rule"
                            checked={stopProcessing}
                            onChange={(e) => setStopProcessing(e.currentTarget.checked)}
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            Conditions
                        </div>
                        <Button
                            variant="default"
                            size="xs"
                            onClick={() =>
                                setConditions((p) => [...p, { field: "subject", op: "contains", value: "" }])
                            }
                        >
                            Add condition
                        </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                        {conditions.map((c, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 md:col-span-4">
                                    <Select
                                        label={idx === 0 ? "Field" : undefined}
                                        value={c.field}
                                        onChange={(v) =>
                                            setConditions((p) =>
                                                p.map((x, i) => (i === idx ? { ...x, field: (v as Field) ?? x.field } : x)),
                                            )
                                        }
                                        data={[
                                            { value: "from", label: "From" },
                                            { value: "to", label: "To" },
                                            { value: "cc", label: "Cc" },
                                            { value: "bcc", label: "Bcc" },
                                            { value: "reply_to", label: "Reply-To" },
                                            { value: "subject", label: "Subject" },
                                            { value: "text", label: "Text" },
                                            { value: "snippet", label: "Snippet" },
                                            { value: "list_id", label: "List-Id" },
                                            { value: "subscription_key", label: "Subscription key" },
                                            { value: "has_attachments", label: "Has attachments" },
                                            { value: "size_bytes", label: "Size (bytes)" },
                                        ]}
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-3">
                                    <Select
                                        label={idx === 0 ? "Operator" : undefined}
                                        value={c.op}
                                        onChange={(v) =>
                                            setConditions((p) =>
                                                p.map((x, i) => (i === idx ? { ...x, op: (v as Op) ?? x.op } : x)),
                                            )
                                        }
                                        data={[
                                            { value: "contains", label: "contains" },
                                            { value: "not_contains", label: "does not contain" },
                                            { value: "eq", label: "is exactly" },
                                            { value: "not_eq", label: "is not" },
                                            { value: "starts_with", label: "starts with" },
                                            { value: "ends_with", label: "ends with" },
                                            { value: "regex", label: "matches regex" },
                                            { value: "exists", label: "exists" },
                                            { value: "not_exists", label: "does not exist" },
                                            { value: "gt", label: ">" },
                                            { value: "gte", label: ">=" },
                                            { value: "lt", label: "<" },
                                            { value: "lte", label: "<=" },
                                            { value: "in", label: "in (comma list)" },
                                            { value: "not_in", label: "not in (comma list)" },
                                        ]}
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    {needsValue(c.op) && !isBooleanField(c.field) ? (
                                        <TextInput
                                            label={idx === 0 ? "Value" : undefined}
                                            value={c.value ?? ""}
                                            onChange={(e) =>
                                                setConditions((p) =>
                                                    p.map((x, i) =>
                                                        i === idx ? { ...x, value: e.currentTarget.value } : x,
                                                    ),
                                                )
                                            }
                                            placeholder={c.field === "size_bytes" ? "e.g. 1048576" : "e.g. newsletter"}
                                        />
                                    ) : (
                                        <div className={idx === 0 ? "pt-6" : "pt-2"} />
                                    )}
                                </div>

                                <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                                    <Button
                                        variant="default"
                                        size="xs"
                                        onClick={() => setConditions((p) => p.filter((_, i) => i !== idx))}
                                        disabled={conditions.length === 1}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            Actions
                        </div>
                        <Button
                            variant="default"
                            size="xs"
                            onClick={() => setActions((p) => [...p, { actionType: "archive" }])}
                        >
                            Add action
                        </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                        {actions.map((a, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 md:col-span-5">
                                    <Select
                                        label={idx === 0 ? "Action" : undefined}
                                        value={a.actionType}
                                        onChange={(v) =>
                                            setActions((p) =>
                                                p.map((x, i) =>
                                                    i === idx ? { ...x, actionType: (v as ActionType) ?? x.actionType } : x,
                                                ),
                                            )
                                        }
                                        data={[
                                            { value: "mark_read", label: "Mark as read" },
                                            { value: "mark_unread", label: "Mark as unread" },
                                            { value: "flag", label: "Flag" },
                                            { value: "unflag", label: "Unflag" },
                                            { value: "add_label", label: "Add label" },
                                            { value: "remove_label", label: "Remove label" },
                                            { value: "move_to_mailbox", label: "Move to mailbox" },
                                            { value: "archive", label: "Archive" },
                                            { value: "trash", label: "Trash" },
                                        ]}
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    {a.actionType === "add_label" || a.actionType === "remove_label" ? (
                                        <TextInput
                                            label={idx === 0 ? "Label ID" : undefined}
                                            value={a.labelId ?? ""}
                                            onChange={(e) =>
                                                setActions((p) =>
                                                    p.map((x, i) =>
                                                        i === idx ? { ...x, labelId: e.currentTarget.value } : x,
                                                    ),
                                                )
                                            }
                                            placeholder="label uuid"
                                        />
                                    ) : a.actionType === "move_to_mailbox" ? (
                                        <TextInput
                                            label={idx === 0 ? "Mailbox ID" : undefined}
                                            value={a.mailboxId ?? ""}
                                            onChange={(e) =>
                                                setActions((p) =>
                                                    p.map((x, i) =>
                                                        i === idx ? { ...x, mailboxId: e.currentTarget.value } : x,
                                                    ),
                                                )
                                            }
                                            placeholder="mailbox uuid"
                                        />
                                    ) : (
                                        <div className={idx === 0 ? "pt-6" : "pt-2"} />
                                    )}
                                </div>

                                <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                                    <Button
                                        variant="default"
                                        size="xs"
                                        onClick={() => setActions((p) => p.filter((_, i) => i !== idx))}
                                        disabled={actions.length === 1}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">
                        V1 note: for label/mailbox selection, this uses raw IDs for now (we can wire dropdowns
                        after we fetch labels/mailboxes).
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}

export default RuleCreateV1;
