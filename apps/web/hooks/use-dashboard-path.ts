"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { withLocale } from "@/lib/utils";

export function useDashboardPath(workspacePublicId?: string) {
	const { locale, wPublicId } = useParams<{
		locale: string;
		wPublicId: string;
	}>();
	const resolvedWorkspacePublicId = workspacePublicId ?? wPublicId;

	return useCallback(
		(path = "") => {
			const normalizedPath = path.replace(/^\/+/, "");
			const suffix = normalizedPath ? `/${normalizedPath}` : "";

			return withLocale(
				locale,
				`/w/${resolvedWorkspacePublicId}/dashboard${suffix}`,
			);
		},
		[locale, resolvedWorkspacePublicId],
	);
}
