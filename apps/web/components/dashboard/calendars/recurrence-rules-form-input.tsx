"use client";
import React, { useMemo, useState } from "react";
import { ReusableFormItems } from "@/components/common/reusable-form-items";
import {
    BaseFormProps,
    Freq,
    ParsedRRuleState,
    RecurrenceRulesFormInputProps,
    UntilMode,
    WEEKDAY_OPTIONS
} from "@schema";
import { Select, NumberInput, Checkbox } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

function parseInitialRrule(value?: string | null): ParsedRRuleState {
    const base: ParsedRRuleState = {
        freq: "none",
        interval: 1,
        untilMode: "never",
        untilDate: null,
        count: "",
        byWeekdays: [],
    };

    if (!value) return base;

    const parts = value.split(";").reduce<Record<string, string>>((acc, part) => {
        const [k, v] = part.split("=");
        if (k && v) acc[k.toUpperCase()] = v;
        return acc;
    }, {});

    const freqRaw = parts["FREQ"];
    if (freqRaw === "DAILY" || freqRaw === "WEEKLY" || freqRaw === "MONTHLY" || freqRaw === "YEARLY") {
        base.freq = freqRaw;
    }

    if (parts["INTERVAL"]) {
        const parsed = Number(parts["INTERVAL"]);
        if (!Number.isNaN(parsed) && parsed > 0) {
            base.interval = parsed;
        }
    }

    if (parts["BYDAY"]) {
        base.byWeekdays = parts["BYDAY"].split(",").filter(Boolean);
    }

    if (parts["UNTIL"]) {
        const s = parts["UNTIL"];
        const datePart = s.slice(0, 8);
        const year = Number(datePart.slice(0, 4));
        const month = Number(datePart.slice(4, 6));
        const day = Number(datePart.slice(6, 8));
        if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
            base.untilDate = new Date(Date.UTC(year, month - 1, day));
            base.untilMode = "on";
        }
    } else if (parts["COUNT"]) {
        const c = Number(parts["COUNT"]);
        if (!Number.isNaN(c) && c > 0) {
            base.count = c;
            base.untilMode = "after";
        }
    }

    if (base.freq === "none") {
        base.untilMode = "never";
        base.untilDate = null;
        base.count = "";
        base.byWeekdays = [];
    }

    return base;
}

function toRealDate(val: unknown): Date | null {
    if (val instanceof Date) return val;
    if (typeof val === "string") {
        const d = new Date(val);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function RecurrenceRulesFormInput({ name, defaultValue }: RecurrenceRulesFormInputProps) {
    const initial = useMemo(() => parseInitialRrule(defaultValue), [defaultValue]);

    const [freq, setFreq] = useState<Freq>(initial.freq);
    const [interval, setInterval] = useState<number>(initial.interval);
    const [untilMode, setUntilMode] = useState<UntilMode>(initial.untilMode);
    const [untilDate, setUntilDate] = useState<Date | null>(initial.untilDate);
    const [count, setCount] = useState<number | "">(initial.count);
    const [byWeekdays, setByWeekdays] = useState<string[]>(initial.byWeekdays);

    const rule = useMemo(() => {
        if (freq === "none") return "";

        const parts: string[] = [`FREQ=${freq}`];

        if (interval && interval > 1) {
            parts.push(`INTERVAL=${interval}`);
        }

        if (freq === "WEEKLY" && byWeekdays.length > 0) {
            parts.push(`BYDAY=${byWeekdays.join(",")}`);
        }

        const realUntil = toRealDate(untilDate);

        if (untilMode === "on" && realUntil) {
            const y = realUntil.getUTCFullYear();
            const m = String(realUntil.getUTCMonth() + 1).padStart(2, "0");
            const d = String(realUntil.getUTCDate()).padStart(2, "0");
            parts.push(`UNTIL=${y}${m}${d}`);
        } else if (untilMode === "after" && typeof count === "number" && count > 0) {
            parts.push(`COUNT=${count}`);
        }

        return parts.join(";");
    }, [freq, interval, untilMode, untilDate, count, byWeekdays]);

    const intervalUnitLabel =
        freq === "DAILY"
            ? "day(s)"
            : freq === "WEEKLY"
                ? "week(s)"
                : freq === "MONTHLY"
                    ? "month(s)"
                    : freq === "YEARLY"
                        ? "year(s)"
                        : "";



    const fields: BaseFormProps["fields"] = [
        {
            name,
            wrapperClasses: "hidden",
            props: {
                type: "hidden",
                value: rule,
                readOnly: true,
            },
        },

        {
            name: `${name}_freq`,
            label: "Repeat",
            kind: "custom",
            component: Select,
            wrapperClasses: freq === "none" ? "col-span-12" : "col-span-4",
            props: {
                value: freq,
                onChange: (val: string | null) => {
                    const nextFreq = (val as Freq) || "none";
                    setFreq(nextFreq);

                    if (nextFreq === "none") {
                        setInterval(1);
                        setUntilMode("never");
                        setUntilDate(null);
                        setCount("");
                        setByWeekdays([]);
                    }
                },
                data: [
                    { value: "none", label: "Does not repeat" },
                    { value: "DAILY", label: "Daily" },
                    { value: "WEEKLY", label: "Weekly" },
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "YEARLY", label: "Yearly" },
                ],
                withCheckIcon: false,
                checkIconPosition: "right",
                allowDeselect: false,
                className: "w-full",
            },
        },

        ...(freq !== "none"
            ? [
                {
                    name: `${name}_interval`,
                    kind: "custom" as const,
                    component: NumberInput,
                    wrapperClasses: "col-span-4",
                    label: "Repeat every",
                    bottomEndSuffix:
                        intervalUnitLabel && (
                            <span className="text-neutral-600 dark:text-neutral-200 mt-1 text-xs">
                {intervalUnitLabel}
              </span>
                        ),
                    props: {
                        value: interval,
                        onChange: (val: string | number | null) => {
                            const n =
                                typeof val === "number"
                                    ? val
                                    : val != null && val !== ""
                                        ? Number(val)
                                        : NaN;
                            setInterval(!Number.isNaN(n) && n > 0 ? n : 1);
                        },
                        min: 1,
                        step: 1,
                    },
                },
            ]
            : []),

        ...(freq !== "none"
            ? [
                {
                    name: `${name}_ends`,
                    label: "Ends",
                    kind: "custom" as const,
                    component: Select,
                    wrapperClasses: "col-span-4",
                    props: {
                        value: untilMode,
                        onChange: (val: string | null) => {
                            const next = (val as UntilMode) || "never";
                            setUntilMode(next);

                            if (next === "never") {
                                setUntilDate(null);
                                setCount("");
                            } else if (next === "on") {
                                setCount("");
                            } else if (next === "after") {
                                setUntilDate(null);
                            }
                        },
                        data: [
                            { value: "never", label: "Never" },
                            { value: "on", label: "On date" },
                            { value: "after", label: "After N occurrences" },
                        ],
                        withCheckIcon: false,
                        checkIconPosition: "right",
                        allowDeselect: false,
                        className: "w-full",
                    },
                },
            ]
            : []),

        ...(freq !== "none" && untilMode === "on"
            ? [
                {
                    name: `${name}_untilDate`,
                    label: "End date",
                    kind: "custom" as const,
                    component: DatePickerInput,
                    wrapperClasses: "col-span-12",
                    props: {
                        value: untilDate,
                        onChange: (d: Date | null) => setUntilDate(d ?? null),
                        placeholder: "Select end date",
                        valueFormat: "DD MMM YYYY",
                        clearable: true,
                    },
                },
            ]
            : []),

        ...(freq === "WEEKLY"
            ? [
                {
                    name: `${name}_byday`,
                    label: "On",
                    kind: "custom" as const,
                    component: Checkbox.Group,
                    wrapperClasses: "col-span-12",
                    props: {
                        value: byWeekdays,
                        onChange: (vals: string[]) => setByWeekdays(vals),
                        children: (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {WEEKDAY_OPTIONS.map((opt) => (
                                    <Checkbox
                                        key={opt.value}
                                        value={opt.value}
                                        label={opt.label}
                                        size="xs"
                                    />
                                ))}
                            </div>
                        ),
                    },
                },
            ]
            : []),

        ...(freq !== "none" && untilMode === "after"
            ? [
                {
                    name: `${name}_count`,
                    label: "Occurrences",
                    kind: "custom" as const,
                    component: NumberInput,
                    wrapperClasses: "col-span-4",
                    props: {
                        value: count,
                        onChange: (val: string | number | null) => {
                            if (val === "" || val === null) {
                                setCount("");
                                return;
                            }
                            const n = typeof val === "number" ? val : Number(val);
                            setCount(!Number.isNaN(n) && n > 0 ? n : "");
                        },
                        min: 1,
                        step: 1,
                    },
                },
            ]
            : []),
    ];

    return (
        <div className="mt-2 border-brand">
            <ReusableFormItems fields={fields} />
        </div>
    );
}

export default RecurrenceRulesFormInput;
