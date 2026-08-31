import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const responsiveModalActionsClassName =
	"flex flex-col-reverse items-stretch gap-2 [&>.mantine-Button-root]:!min-h-11 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end sm:[&>.mantine-Button-root]:!min-h-9";

type ModalActionsProps = {
	children: ReactNode;
	className?: string;
};

export function ModalActions({ children, className }: ModalActionsProps) {
	return (
		<div className={cn(responsiveModalActionsClassName, "pt-2", className)}>
			{children}
		</div>
	);
}
