"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, X } from "lucide-react";

type Props = {
	backHref: string;
	nextHref?: string | null;
	previousHref?: string | null;
	messageCount: number;
};

export default function ThreadNavigationControls({
	backHref,
	nextHref,
	previousHref,
	messageCount,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const navigate = useCallback(
		(href?: string | null) => {
			if (!href || isPending) return;
			startTransition(() => router.push(href));
		},
		[isPending, router],
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const tagName = target?.tagName?.toLowerCase();
			if (
				tagName === "input" ||
				tagName === "textarea" ||
				target?.isContentEditable
			) {
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				navigate(backHref);
			}

			if ((event.key === "j" || event.key === "ArrowDown") && nextHref) {
				event.preventDefault();
				navigate(nextHref);
			}

			if ((event.key === "k" || event.key === "ArrowUp") && previousHref) {
				event.preventDefault();
				navigate(previousHref);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [backHref, navigate, nextHref, previousHref]);

	const navButtonClass =
		"inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
	const subtleClass = `${navButtonClass} hover:bg-muted text-muted-foreground hover:text-foreground`;
	const outlineClass = `${navButtonClass} border border-border bg-background hover:bg-muted`;

	return (
		<div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => navigate(backHref)}
					disabled={isPending}
					className={subtleClass}
				>
					<X size={14} />
					Close
				</button>
				<button
					type="button"
					onClick={() => navigate(backHref)}
					disabled={isPending}
					className={subtleClass}
				>
					<ArrowLeft size={14} />
					Back to list
				</button>
				<span className="text-xs text-muted-foreground">
					{isPending
						? "Loading…"
						: messageCount > 1
							? `${messageCount} messages in this thread`
							: "Single message"}
				</span>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => navigate(previousHref)}
					disabled={!previousHref || isPending}
					className={outlineClass}
					title="Previous message/thread (k or Up)"
				>
					<ChevronUp size={14} />
					Previous
				</button>
				<button
					type="button"
					onClick={() => navigate(nextHref)}
					disabled={!nextHref || isPending}
					className={outlineClass}
					title="Next message/thread (j or Down)"
				>
					Next
					<ChevronDown size={14} />
				</button>
			</div>
		</div>
	);
}
