// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as React from "react";
import { PROVIDER_CONFIG } from "@/components/dashboard/identities/PROVIDER_CONFIG";

export default function ProviderBadge({
										  providerType,
									  }: {
	providerType?: string | null;
}) {
	if (!providerType) return null;

	const p = PROVIDER_CONFIG[providerType];

	if (!p) {
		return (
			<Badge
				variant="outline"
				className="gap-1.5 whitespace-nowrap border"
			>
				<span className="h-2 w-2 rounded-full bg-gray-500" />
				{providerType}
			</Badge>
		);
	}

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
