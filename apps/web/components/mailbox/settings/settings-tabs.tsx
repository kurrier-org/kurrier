"use client";

import React from "react";
import {
    Cog,
    Filter,
    Signature,
} from "lucide-react";
import Link from "next/link";
import {
    useParams,
    usePathname,
} from "next/navigation";

import {
    useOptionalDictionary,
} from "@/components/providers/dictionary-provider";

type SidebarItemProps = {
    icon: React.ReactNode;
    label: string;
    href: string;
    exact?: boolean;
};

function normalizePath(path: string): string {
    /*
     * Removes the locale prefix by starting at /w/.
     * Example:
     * /en/w/abc/dashboard/... -> /w/abc/dashboard/...
     */
    const workspaceIndex =
        path.indexOf("/w/");

    const normalized =
        workspaceIndex === -1
            ? path
            : path.slice(workspaceIndex);

    return normalized.replace(/\/+$/, "");
}

function SidebarItem({
                         icon,
                         label,
                         href,
                         exact = false,
                     }: SidebarItemProps) {
    const pathname = usePathname();

    const currentPath =
        normalizePath(pathname);

    const targetPath =
        normalizePath(href);

    const active = exact
        ? currentPath === targetPath
        : currentPath === targetPath ||
        currentPath.startsWith(
            `${targetPath}/`,
        );

    return (
        <Link
            href={href}
            aria-current={
                active ? "page" : undefined
            }
            className={[
                "flex w-full items-center gap-2 rounded-lg px-3 py-2",
                "text-left text-sm transition-colors",
                active
                    ? "bg-brand/10 text-brand dark:bg-brand/50 dark:text-brand-foreground"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
            ].join(" ")}
        >
            <span className="shrink-0">
                {icon}
            </span>

            <span className="truncate">
                {label}
            </span>
        </Link>
    );
}

type SettingsTabsProps = {
    workspacePublicId: string;
};

export default function SettingsTabs({
                                         workspacePublicId,
                                     }: SettingsTabsProps) {
    const dict =
        useOptionalDictionary();

    const params = useParams<{
        identityPublicId: string;
    }>();

    const settingsBase =
        `/w/${workspacePublicId}` +
        `/dashboard/mail/` +
        `${params.identityPublicId}` +
        `/settings`;

    const tabs = [
        {
            key: "general",
            label:
                dict?.mailbox?.general ??
                "General",
            icon: <Cog size={16} />,
            href: settingsBase,
            exact: true,
        },
        {
            key: "rules",
            label:
                dict?.mailbox?.rules ??
                "Rules",
            icon: <Filter size={16} />,
            href: `${settingsBase}/rules`,
        },
        {
            key: "signatures",
            label: "Signatures",
            icon: <Signature size={16} />,
            href: `${settingsBase}/signatures`,
        },
    ];

    return (
        <div className="space-y-1">
            {tabs.map((tab) => (
                <SidebarItem
                    key={tab.key}
                    href={tab.href}
                    icon={tab.icon}
                    label={tab.label}
                    exact={tab.exact}
                />
            ))}
        </div>
    );
}
