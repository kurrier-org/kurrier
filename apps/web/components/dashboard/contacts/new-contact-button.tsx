"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";

export default function NewContactButton({
	hideOnMobile,
	workspacePublicId,
}: {
	hideOnMobile?: boolean;
	workspacePublicId: string;
}) {
	const dict = useOptionalDictionary();

	return (
		<Button
			asChild
			size={hideOnMobile ? "lg" : "icon"}
			className={hideOnMobile ? "hidden w-full md:inline-flex" : "md:hidden"}
		>
			<Link href={`/w/${workspacePublicId}/dashboard/contacts/new`}>
				<Plus />
				<span className={hideOnMobile ? "" : "sr-only"}>
					{dict?.contacts?.createContact ?? "Create Contact"}
				</span>
			</Link>
		</Button>
	);
}
