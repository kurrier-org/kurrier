// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as React from "react";
import { PROVIDER_CONFIG } from "@/components/dashboard/identities/PROVIDER_CONFIG";

export default function ProviderBadge({
	providerType,
}: {
	providerType: string;
}) {
	if (!providerType) return null;
	const p = PROVIDER_CONFIG[providerType];
	return (
		<Badge
			variant="outline"
			className={cn(
				"gap-1.5 border",
				p.chip,
				p.chipDark,
				p.textDark,
				"whitespace-nowrap",
			)}
		>
			<span className={cn("h-2 w-2 rounded-full", p.dot)} />
			{p.name}
		</Badge>
	);
}
