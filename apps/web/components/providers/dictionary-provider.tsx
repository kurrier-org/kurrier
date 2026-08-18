"use client";

import dayjs from "dayjs";
import { createContext, useContext, useEffect } from "react";
import "dayjs/locale/pt-br";
import type { Dictionary } from "@/lib/dictionaries";

const DAYJS_LOCALES: Record<string, string> = {
	en: "en",
	"pt-BR": "pt-br",
	ko: "en",
};

const Ctx = createContext<Dictionary | null>(null);

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

	return <Ctx.Provider value={dict}>{children}</Ctx.Provider>;
}

export function useDictionary() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useDictionary must be used within <DictionaryProvider>");
	return ctx;
}

/**
 * Same as useDictionary(), but returns null instead of throwing when used
 * outside a <DictionaryProvider>. For shared, high-blast-radius components
 * (forms, generic error rendering) that must keep working even in the rare
 * tree that isn't wrapped yet, falling back to raw/untranslated text.
 */
export function useOptionalDictionary() {
	return useContext(Ctx);
}
