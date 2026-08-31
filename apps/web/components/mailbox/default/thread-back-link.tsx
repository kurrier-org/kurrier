"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";

export default function ThreadBackLink({ href }: { href: string }) {
	const dict = useOptionalDictionary();

	return (
		<div className="border-b px-3 py-2 xl:hidden">
			<Button asChild variant="ghost" size="sm">
				<Link href={href}>
					<ArrowLeft />
					{dict?.common?.back ?? "Back"}
				</Link>
			</Button>
		</div>
	);
}
