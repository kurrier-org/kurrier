"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/lib/dictionaries";

const Ctx = createContext<Dictionary | null>(null);

export function DictionaryProvider({
	dict,
	children,
}: {
	dict: Dictionary;
	children: React.ReactNode;
}) {
	return <Ctx.Provider value={dict}>{children}</Ctx.Provider>;
}

export function useDictionary() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useDictionary must be used within <DictionaryProvider>");
	return ctx;
}
