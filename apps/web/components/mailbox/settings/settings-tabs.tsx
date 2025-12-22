"use client";
import React, {useMemo} from 'react';
import {Bell, Cog, Filter, Trash2} from "lucide-react";
import Link from "next/link";
import {useParams, usePathname} from "next/navigation";

function SidebarItem({ icon, label, href }: {
    icon: React.ReactNode;
    label: string;
    href: string;
}) {
    const active = usePathname() === href;
    return (
        <Link
            type="button"
            href={href}
            className={[
                "w-full rounded-lg px-3 py-2 text-left text-sm",
                "flex items-center gap-2",
                active
                    ? "bg-brand/10 text-brand dark:text-brand-foreground dark:bg-brand/50"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
            ].join(" ")}
        >
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </Link>
    );
}

function SettingsTabs() {

    const params = useParams()

    const tabs = useMemo(
        () => [
            { key: "general" as const, label: "General", icon: <Cog size={16} />, href: `/dashboard/mail/${params.identityPublicId}/settings` },
            { key: "rules" as const, label: "Rules", icon: <Filter size={16} />, href: `/dashboard/mail/${params.identityPublicId}/settings/rules` },
            // { key: "subscriptions" as const, label: "Subscriptions", icon: <Bell size={16} />, href: `/dashboard/mail/${params.identityPublicId}/settings/subscriptions` },
            // { key: "danger" as const, label: "Danger zone", icon: <Trash2 size={16} />, href: `/dashboard/mail/${params.identityPublicId}/settings/danger` },
        ],
        [],
    );


    return <>
        <div className="space-y-1">
            {tabs.map((t) => (
                <SidebarItem
                    key={t.key}
                    href={t.href}
                    icon={t.icon}
                    label={t.label}
                />
            ))}
        </div>
    </>
}

export default SettingsTabs;
