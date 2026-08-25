"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import KurrierLogo from "@/components/common/kurrier-logo";
import { hasLocale } from "@/lib/locale";

export default function NotFoundView() {
	const pathname = usePathname();
	const firstSegment = pathname.split("/")[1] ?? "";
	const locale = hasLocale(firstSegment) ? firstSegment : "en";

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
			<Link href={`/${locale}`} className="flex items-center gap-2 font-medium">
				<KurrierLogo size={40} />
				<span className="text-2xl font-medium">Kurrier</span>
			</Link>
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Page not found</h1>
				<p className="text-sm text-muted-foreground">
					The page you're looking for doesn't exist or may have been moved.
				</p>
			</div>
			<Link
				href={`/${locale}`}
				className="text-sm underline underline-offset-4"
			>
				Back to Kurrier
			</Link>
		</div>
	);
}
