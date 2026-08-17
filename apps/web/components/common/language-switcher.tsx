"use client";

import { Languages } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocaleServer } from "@/lib/actions/locale";
import { hasLocale, type Locale } from "@/lib/locale";

const LOCALE_LABELS: Record<Locale, string> = {
	en: "English",
	ko: "한국어",
	br: "Português (Brasil)",
};

const locales = Object.keys(LOCALE_LABELS) as Locale[];

function useLocaleSwitch() {
	const params = useParams<{ locale?: string }>();
	const pathname = usePathname();
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	const currentLocale: Locale = hasLocale(String(params?.locale))
		? (params.locale as Locale)
		: "en";

	function buildPath(next: Locale) {
		const segments = pathname.split("/");
		if (segments[1] && hasLocale(segments[1])) {
			segments[1] = next;
		} else {
			segments.splice(1, 0, next);
		}
		return segments.join("/") || "/";
	}

	function onSelect(next: string) {
		if (!hasLocale(next) || next === currentLocale) return;
		startTransition(async () => {
			await setLocaleServer(next);
			router.push(buildPath(next));
			router.refresh();
		});
	}

	return { currentLocale, pending, onSelect };
}

/**
 * Standalone trigger for contexts without an existing dropdown menu
 * (e.g. the login/signup pages).
 */
export function LanguageSwitcher() {
	const { currentLocale, pending, onSelect } = useLocaleSwitch();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" disabled={pending}>
					<Languages />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup value={currentLocale} onValueChange={onSelect}>
					{locales.map((locale) => (
						<DropdownMenuRadioItem key={locale} value={locale}>
							{LOCALE_LABELS[locale]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * Submenu variant for nesting inside an already-open DropdownMenu
 * (e.g. the workspace nav user menu).
 */
export function LanguageSwitcherSubmenu() {
	const { currentLocale, pending, onSelect } = useLocaleSwitch();
	const dict = useOptionalDictionary();

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger disabled={pending}>
				<Languages />
				{dict?.common?.language ?? "Language"}
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent>
				<DropdownMenuRadioGroup value={currentLocale} onValueChange={onSelect}>
					{locales.map((locale) => (
						<DropdownMenuRadioItem key={locale} value={locale}>
							{LOCALE_LABELS[locale]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
}
