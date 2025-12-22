import React from "react";
import { Divider } from "@mantine/core";

export default function SectionCard({
                         title,
                         description,
                         children,
                         footer,
                     }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer ? (
                <>
                    <Divider />
                    <div className="px-5 py-4">{footer}</div>
                </>
            ) : null}
        </div>
    );
}
