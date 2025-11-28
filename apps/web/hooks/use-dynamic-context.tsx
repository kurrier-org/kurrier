"use client";
import React, {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
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
                                                       }: {
    children: ReactNode;
    initialState: T;
}) {
    const [state, setState] = useState<T>(initialState);

    const value = useMemo(() => ({ state, setState }), [state]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDynamicContext<T extends Dict>(): DynamicContextType<T> {
    const ctx = useContext(Ctx);
    if (!ctx) {
        throw new Error("useDynamicContext must be used within a DynamicContextProvider");
    }
    return ctx as DynamicContextType<T>;
}



// "use client";
// import React, {
// 	createContext,
// 	useContext,
// 	useMemo,
// 	useState,
// 	useEffect,
// 	type ReactNode,
// } from "react";
//
// type Dict = Record<string, unknown>;
//
// type DynamicContextType<T extends Dict> = {
// 	state: T;
// 	setState: React.Dispatch<React.SetStateAction<T>>;
// };
//
// const Ctx = createContext<DynamicContextType<any> | null>(null);
//
// export function DynamicContextProvider<T extends Dict>({
// 	children,
// 	initialState,
// }: {
// 	children: ReactNode;
// 	initialState: T;
// }) {
// 	const [state, setState] = useState<T>(initialState);
//
// 	useEffect(() => {
// 		setState((prev) => (prev === initialState ? prev : initialState));
// 	}, [initialState]);
//
// 	const value = useMemo(() => ({ state, setState }), [state]);
//
// 	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
// }
//
// export function useDynamicContext<T extends Dict>(): DynamicContextType<T> {
// 	const ctx = useContext(Ctx);
// 	if (!ctx) {
// 		throw new Error(
// 			"useDynamicContext must be used within a DynamicContextProvider",
// 		);
// 	}
// 	return ctx as DynamicContextType<T>;
// }
