// @ts-nocheck
"use client";

import * as React from "react";
import { PROVIDER_CONFIG } from "@/components/dashboard/identities/PROVIDER_CONFIG";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PROVIDER_NAME_KEYS: Record<string, string> = {
	s3: "providerNameS3",
	ses: "providerNameSes",
	google: "providerNameGoogle",
	sendgrid: "providerNameSendgrid",
	mailgun: "providerNameMailgun",
	postmark: "providerNamePostmark",
	smtp: "providerNameSmtp",
};

export default function ProviderBadge({
	providerType,
}: {
	providerType?: string | null;
}) {
	const dict = useOptionalDictionary();
	if (!providerType) return null;

	const p = PROVIDER_CONFIG[providerType];

	if (!p) {
		return (
			<Badge variant="outline" className="gap-1.5 whitespace-nowrap border">
				<span className="h-2 w-2 rounded-full bg-gray-500" />
				{providerType}
			</Badge>
		);
	}

	const name = dict?.platform?.[PROVIDER_NAME_KEYS[providerType]] ?? p.name;

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
			{name}
		</Badge>
	);
}
