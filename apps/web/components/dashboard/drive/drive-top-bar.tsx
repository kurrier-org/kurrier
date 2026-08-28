"use client";

import type { DriveRouteContext, DriveState } from "@schema";
import Link from "next/link";
import { useEffect } from "react";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

function encodeSegments(segs: string[]) {
	return segs.map(encodeURIComponent);
}

export function buildDriveBreadcrumb(
	ctx: {
		within: string[];
		driveVolume: {
			publicId: string;
			label?: string;
			code?: string;
		} | null;
	},
	workspacePublicId: string,
	dict?: ReturnType<typeof useOptionalDictionary>,
) {
	const out: { label: string; href: string }[] = [];

	out.push({
		label: dict?.drive?.myDrive ?? "My Drive",
		href: `/w/${workspacePublicId}/dashboard/drive`,
	});

	const vol = ctx.driveVolume;

	if (vol) {
		out.push({
			label: vol.label || vol.code || (dict?.drive?.volume ?? "Volume"),
			href: `/w/${workspacePublicId}/dashboard/drive/volumes/${encodeURIComponent(vol.publicId)}`,
		});
	}

	const base = `/w/${workspacePublicId}/dashboard/drive/volumes/${encodeURIComponent(
		vol?.publicId || "",
	)}`;

	const acc: string[] = [];

	for (const seg of ctx.within) {
		acc.push(seg);

		out.push({
			label: seg,
			href: `${base}/${encodeSegments(acc).join("/")}`,
		});
	}

	return out;
}

function DriveTopBar({
	ctx,
	userId,
	workspacePublicId,
}: {
	ctx: DriveRouteContext;
	userId: string;
	workspacePublicId: string;
}) {
	const dict = useOptionalDictionary();
	const { setState } = useDynamicContext<DriveState>();

	useEffect(() => {
		setState((prevState) => ({
			...prevState,
			driveRouteContext: ctx,
			userId,
		}));
	}, [ctx, userId, setState]);

	const crumbs = buildDriveBreadcrumb(
		{
			within: ctx.within,
			driveVolume: ctx.driveVolume
				? {
						publicId: ctx.driveVolume.publicId,
						label: ctx.driveVolume.label,
						code: ctx.driveVolume.code,
					}
				: null,
		},
		workspacePublicId,
		dict,
	);

	return (
		<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
			{crumbs.map((c, i) => {
				const isRoot = i === 0;
				const isLast = i === crumbs.length - 1;

				return (
					<div
						key={c.href}
						className="flex min-w-0 items-center gap-2 last:flex-1"
					>
						{i > 0 && <span className="text-muted-foreground">/</span>}

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
	);
}

export default DriveTopBar;
