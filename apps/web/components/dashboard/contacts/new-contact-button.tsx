"use client";
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionIcon } from "@mantine/core";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";

export default function NewContactButton({
	hideOnMobile,
	workspacePublicId
}: {
	hideOnMobile?: boolean;
	workspacePublicId: string;
}) {
	const isMobile = useIsMobile();

	return (
		<>
			{isMobile ? (
				<ActionIcon>
					<Link href={`/w/${workspacePublicId}/dashboard/contacts/new`}>
						<Plus className="h-4 w-4" />
					</Link>
				</ActionIcon>
			) : (
				<Button asChild={true} hidden={!hideOnMobile} size="lg">
					<Link href={`/w/${workspacePublicId}/dashboard/contacts/new`}>
						<Plus className="h-5 w-5" />
						Create Contact
					</Link>
				</Button>
			)}
		</>
	);
}
