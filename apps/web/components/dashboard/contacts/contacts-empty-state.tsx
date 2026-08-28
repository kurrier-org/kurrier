"use client";

import { ContactRound, Plus } from "lucide-react";
import Link from "next/link";

import DashboardEmptyState from "@/components/dashboard/dashboard-empty-state";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";

export default function ContactsEmptyState({
	workspacePublicId,
	filtered = false,
	className,
}: {
	workspacePublicId: string;
	filtered?: boolean;
	className?: string;
}) {
	const dict = useOptionalDictionary();

	return (
		<DashboardEmptyState
			className={className}
			icon={<ContactRound className="size-5" aria-hidden="true" />}
			title={
				filtered
					? (dict?.contacts?.noContactFound ?? "No contacts found")
					: (dict?.contacts?.emptyTitle ?? "No contacts yet")
			}
			description={
				filtered
					? undefined
					: (dict?.contacts?.emptyDescription ??
						"Create your first contact to keep names, email addresses, and phone numbers in one place.")
			}
			action={
				<Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
					<Link href={`/w/${workspacePublicId}/dashboard/contacts/new`}>
						<Plus className="size-4" aria-hidden="true" />
						{dict?.contacts?.createContact ?? "Create contact"}
					</Link>
				</Button>
			}
		/>
	);
}
