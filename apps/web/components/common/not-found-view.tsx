"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import KurrierLogo from "@/components/common/kurrier-logo";
import { hasLocale, type Locale } from "@/lib/locale";

// This view is also reachable from the root app/not-found.tsx boundary,
// which sits outside app/[locale]/layout.tsx and therefore has no
// DictionaryProvider to read from — so it derives its own locale from the
// URL and keeps a tiny self-contained copy of these strings instead.
const COPY: Record<Locale, { title: string; body: string; back: string }> = {
	en: {
		title: "Page not found",
		body: "The page you're looking for doesn't exist or may have been moved.",
		back: "Back to Kurrier",
	},
	"pt-BR": {
		title: "Página não encontrada",
		body: "A página que você está procurando não existe ou pode ter sido movida.",
		back: "Voltar ao Kurrier",
	},
	ko: {
		title: "Page not found",
		body: "The page you're looking for doesn't exist or may have been moved.",
		back: "Back to Kurrier",
	},
	pl: {
		title: "Nie znaleziono strony",
		body: "Strona, której szukasz, nie istnieje lub została przeniesiona.",
		back: "Wróć do Kurrier",
	},
	ru: {
		title: "Страница не найдена",
		body: "Страница, которую вы ищете, не существует или была перемещена.",
		back: "Вернуться в Kurrier",
	},
};

export default function NotFoundView() {
	const pathname = usePathname();
	const firstSegment = pathname.split("/")[1] ?? "";
	const locale = hasLocale(firstSegment) ? firstSegment : "en";
	const copy = COPY[locale];

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
			<Link href={`/${locale}`} className="flex items-center gap-2 font-medium">
				<KurrierLogo size={40} />
				<span className="text-2xl font-medium">Kurrier</span>
			</Link>

			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">{copy.title}</h1>
				<p className="text-sm text-muted-foreground">{copy.body}</p>
			</div>

			<Link
				href={`/${locale}`}
				className="text-sm underline underline-offset-4"
			>
				{copy.back}
			</Link>
		</div>
	);
}
