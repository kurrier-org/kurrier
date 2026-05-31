"use client";
import React, {
	createContext,
	useContext,
	useMemo,
	useState,
	type ReactNode, useEffect,
} from "react";

type Dict = Record<string, unknown>;

type DynamicContextType<T extends Dict> = {
	state: T;
	setState: React.Dispatch<React.SetStateAction<T>>;
};

const Ctx = createContext<DynamicContextType<any> | null>(null);

export function DynamicContextProvider<T extends Dict>({
														   children,
														   initialState,
														   syncOnChange = false,
													   }: {
	children: ReactNode;
	initialState: T;
	syncOnChange?: boolean;
}) {
	const [state, setState] = useState<T>(initialState);
	useEffect(() => {
		if (syncOnChange) {
			setState(initialState);
		}
	}, [initialState, syncOnChange]);

	const value = useMemo(() => ({ state, setState }), [state]);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDynamicContext<T extends Dict>(): DynamicContextType<T> {
	const ctx = useContext(Ctx);
	if (!ctx) {
		throw new Error(
			"useDynamicContext must be used within a DynamicContextProvider",
		);
	}
	return ctx as DynamicContextType<T>;
}
