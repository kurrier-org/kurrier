"use client";

import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";

export function GridPatternDemo() {
	return (
		<div className="bg-background relative flex size-full items-center justify-center overflow-hidden rounded-lg p-36">
			<GridPattern
				width={30}
				height={30}
				x={-1}
				y={-1}
				strokeDasharray={"4 2"}
				className={cn(
					"[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]",
				)}
			/>
		</div>
	);
}
