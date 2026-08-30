"use client";

import dayjs from "dayjs";
import { createContext, useContext, useEffect } from "react";
import "dayjs/locale/pl";
import "dayjs/locale/pt-br";
import "dayjs/locale/ru";
import type { Dictionary } from "@/lib/dictionaries";
import { createLocaleFormatter, type LocaleFormatter } from "@/lib/locale-format";
import { DAYJS_LOCALES } from "@/lib/locale";

type I18n = {
	dict: Dictionary;
	format: LocaleFormatter;
};

const Ctx = createContext<I18n | null>(null);

export function DictionaryProvider({
	dict,
	children,
}: {
	dict: Dictionary;
	children: React.ReactNode;
}) {
	useEffect(() => {
		dayjs.locale(DAYJS_LOCALES[dict.locale] ?? "en");
	}, [dict.locale]);

	return (
		<Ctx.Provider
			value={{ dict, format: createLocaleFormatter(dict.locale) }}
		>
			{children}
		</Ctx.Provider>
	);
}

export function useDictionary() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useDictionary must be used within <DictionaryProvider>");
	return ctx.dict;
}

/**
 * Same as useDictionary(), but returns null instead of throwing when used
 * outside a <DictionaryProvider>. For shared, high-blast-radius components
 * (forms, generic error rendering) that must keep working even in the rare
 * tree that isn't wrapped yet, falling back to raw/untranslated text.
 */
export function useOptionalDictionary() {
	return useContext(Ctx)?.dict ?? null;
}

/** Returns the dictionary and locale formatter for client components. */
export function useI18n() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useI18n must be used within <DictionaryProvider>");
	return ctx;
}

/** Optional variant for shared components rendered outside the provider. */
export function useOptionalI18n() {
	return useContext(Ctx);
}
