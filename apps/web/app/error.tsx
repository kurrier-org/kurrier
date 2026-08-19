"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import KurrierLogo from "@/components/common/kurrier-logo";
import { hasLocale } from "@/lib/locale";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const pathname = usePathname();
	const firstSegment = pathname.split("/")[1] ?? "";
	const locale = hasLocale(firstSegment) ? firstSegment : "en";

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
			<Link href={`/${locale}`} className="flex items-center gap-2 font-medium">
				<KurrierLogo size={40} />
				<span className="text-2xl font-medium">Kurrier</span>
			</Link>
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Something went wrong</h1>
				<p className="text-sm text-muted-foreground">
					An unexpected error occurred. You can try again, or head back home.
				</p>
			</div>
			<div className="flex gap-4">
				<button
					type="button"
					onClick={reset}
					className="text-sm underline underline-offset-4"
				>
					Try again
				</button>
				<Link
					href={`/${locale}`}
					className="text-sm underline underline-offset-4"
				>
					Back to Kurrier
				</Link>
			</div>
		</div>
	);
}
