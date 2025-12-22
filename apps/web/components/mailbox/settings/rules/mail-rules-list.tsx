"use client";
import React from "react";
import { deleteRule, FetchMailRulesResult, toggleRule } from "@/lib/actions/mail-rules";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import { Power, PowerOff, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";

function formatActionLabel(a: string) {
    return a.replaceAll("_", " ");
}

export default function MailRulesList({ rules }: { rules: FetchMailRulesResult }) {
    if (!rules.length) {
        return (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                No rules yet.
            </div>
        );
    }

    const pathname = usePathname()

    return (
        <div className="mt-6 space-y-3">
            {rules.map((r) => {
                const actions = r.actions
                    .slice()
                    .sort((a, b) => a.order - b.order);

                const chips = actions.map((a) => (
                    <span
                        key={a.id}
                        className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-200"
                    >
                        {formatActionLabel(a.actionType)}
                    </span>
                ));

                return (
                    <div
                        key={r.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                        {r.name}
                                    </div>

                                    <span
                                        className={[
                                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                            r.enabled
                                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
                                        ].join(" ")}
                                    >
                                        {r.enabled ? "Enabled" : "Disabled"}
                                    </span>

                                    {/*{r.stopProcessing ? (*/}
                                    {/*    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">*/}
                                    {/*        Stops processing*/}
                                    {/*    </span>*/}
                                    {/*) : null}*/}
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                                    <span>Priority {r.priority}</span>
                                    {/*<span className="text-neutral-300 dark:text-neutral-700">•</span>*/}
                                    {/*<span>{r.stopProcessing ? "No further rules after match" : "Continue after match"}</span>*/}
                                </div>
                            </div>

                            <div className={"flex items-center gap-3"}>

                                <ReusableFormButton
                                    action={toggleRule}
                                    actionIcon
                                    key={`${r.id}-toggle-${r.enabled ? "on" : "off"}`}
                                    actionIconProps={{
                                        size: "sm",
                                        variant: "subtle",
                                        children: r.enabled ? <Power size={16} /> : <PowerOff size={16} />,
                                        title: "Toggle rule",
                                        className:
                                            "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900",
                                    }}
                                >
                                    <input type="hidden" name="ruleId" value={r.id} />
                                    <input type="hidden" name="pathname" value={pathname} />
                                </ReusableFormButton>

                                <ReusableFormButton
                                    action={deleteRule}
                                    actionIcon
                                    key={`${r.id}-delete`}
                                    actionIconProps={{
                                        size: "sm",
                                        variant: "light",
                                        children: <Trash2 size={16} />,
                                        title: "Delete rule",
                                        className:
                                            "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900",
                                    }}
                                >
                                    <input type="hidden" name="ruleId" value={r.id} />
                                </ReusableFormButton>
                            </div>

                        </div>

                        <div className="mt-4">
                            <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                Actions
                            </div>

                            {chips.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">{chips}</div>
                            ) : (
                                <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                                    None
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
