import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function ContentPlaceholder({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 items-center justify-center px-6 py-12 text-center",
				className,
			)}
		>
			<div className="flex w-full max-w-sm flex-col items-center">
				<div className="flex size-12 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
					{icon}
				</div>
				<h2 className="mt-4 text-base font-semibold text-foreground">
					{title}
				</h2>
				{description && (
					<p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">
						{description}
					</p>
				)}
				{action && <div className="mt-5 w-full sm:w-auto">{action}</div>}
			</div>
		</div>
	);
}
