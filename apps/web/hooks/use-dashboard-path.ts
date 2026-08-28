"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { withLocale } from "@/lib/utils";

export function useDashboardPath(workspacePublicId?: string) {
	const { locale } = useParams<{ locale: string }>();

	return useCallback(
		(path = "") => {
			const normalizedPath = path.replace(/^\/+/, "");
			const suffix = normalizedPath ? `/${normalizedPath}` : "";

			return withLocale(locale, `/w/${workspacePublicId}/dashboard${suffix}`);
		},
		[locale, workspacePublicId],
	);
}
