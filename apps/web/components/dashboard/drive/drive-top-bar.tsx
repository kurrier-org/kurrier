"use client"
import React, {useEffect} from 'react';
import {DriveRouteContext, DriveState} from "@schema";
import {useDynamicContext} from "@/hooks/use-dynamic-context";
import Link from "next/link";

function encodeSegments(segs: string[]) {
    return segs.map(encodeURIComponent);
}

export function buildDriveBreadcrumb(ctx: {
    scope: "home" | "cloud";
    within: string[];
    driveVolume: { publicId: string; label?: string; code?: string } | null;
}) {
    const out: { label: string; href: string }[] = [];

    out.push({ label: "My Drive", href: "/dashboard/drive" });

    if (ctx.scope === "cloud") {
        const vol = ctx.driveVolume;
        const volLabel = vol?.label || vol?.code || "Cloud volume";
        const volId = vol?.publicId || "";
        out.push({ label: volLabel, href: `/dashboard/drive/volumes/${encodeURIComponent(volId)}` });
    }

    let acc: string[] = [];
    for (const seg of ctx.within) {
        acc.push(seg);

        const base =
            ctx.scope === "cloud"
                ? `/dashboard/drive/volumes/${encodeURIComponent(ctx.driveVolume?.publicId || "")}`
                : "/dashboard/drive";

        const href = `${base}/${encodeSegments(acc).join("/")}`;
        out.push({ label: seg, href });
    }

    return out;
}

function DriveTopBar({ ctx, userId }:{ ctx: DriveRouteContext, userId: string }) {

    const {setState} = useDynamicContext<DriveState>()

    useEffect(() => {
        if (ctx){
            setState((prevState) => ({
                ...prevState,
                driveRouteContext: ctx,
                userId
            }))
        }
    }, [ctx])

    const crumbs = buildDriveBreadcrumb(ctx);

    return <>
        <div className="flex items-center gap-2 min-w-0">
            {crumbs.map((c, i) => {
                const isRoot = i === 0;
                const isLast = i === crumbs.length - 1;

                return (
                    <div key={c.href} className="flex items-center gap-2 min-w-0">
                        {i > 0 && (
                            <span className="text-muted-foreground">/</span>
                        )}

                        <Link
                            href={c.href}
                            className={[
                                "truncate text-sm transition-colors",
                                isRoot
                                    ? "font-semibold text-brand dark:text-brand-300"
                                    : isLast
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            {c.label}
                        </Link>
                    </div>
                );
            })}
        </div>
    </>
}

export default DriveTopBar;
