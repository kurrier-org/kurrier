import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export default function DashboardPageHeader({
	title,
	children,
	className,
}: {
	title?: string;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<header
			className={cn(
				"flex h-14 min-w-0 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur",
				className,
			)}
		>
			<SidebarTrigger className="-ml-1 size-10 shrink-0 md:size-7" />
			<Separator
				orientation="vertical"
				className="shrink-0 data-[orientation=vertical]:h-4"
			/>
			{children ?? (
				<h1 className="min-w-0 truncate text-sm font-semibold text-foreground/80">
					{title}
				</h1>
			)}
		</header>
	);
}
