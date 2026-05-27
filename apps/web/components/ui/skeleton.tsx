import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SkeletonProps = Omit<HTMLAttributes<HTMLDivElement>, "ref">;

function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			data-slot="skeleton"
			className={cn("bg-accent animate-pulse rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
