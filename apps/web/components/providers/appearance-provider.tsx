"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { ThemeName, ThemeMode } from "@schema/types/themes";
import {
	setModeServer,
	setResolvedServer,
	setThemeServer,
} from "@/lib/actions/appearance";
import {Toaster} from "@/components/ui/sonner";
// import {MantineProvider} from "@mantine/core";
// import {createMantineTheme} from "@/lib/mantine-theme";

type AppearanceCtx = {
	theme: ThemeName;
	mode: ThemeMode;
	setTheme: (t: ThemeName) => void;
	setMode: (m: ThemeMode) => void;
	pending: boolean;
};

const Ctx = createContext<AppearanceCtx | null>(null);

export function AppearanceProvider({
	children,
	initialTheme,
	initialMode,
}: {
	children: React.ReactNode;
	initialTheme: ThemeName;
	initialMode: ThemeMode;
}) {
	const router = useRouter();
	const [pending, start] = useTransition();
	const [theme, setThemeState] = useState<ThemeName>(initialTheme);
	const [mode, setModeState] = useState<ThemeMode>(initialMode);

	const mmRef = useRef<MediaQueryList | null>(null);
	const listenerRef = useRef<((e: MediaQueryListEvent) => void) | null>(null);

	// Keep DOM synced with theme
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	// Keep DOM + cookies synced with mode
	useEffect(() => {
		const el = document.documentElement;

		// cleanup previous listener
		if (mmRef.current && listenerRef.current) {
			mmRef.current.removeEventListener?.("change", listenerRef.current);
			mmRef.current.removeListener?.(listenerRef.current);
			mmRef.current = null;
			listenerRef.current = null;
		}

		if (mode === "dark") {
			el.classList.add("dark");
			return;
		}
		if (mode === "light") {
			el.classList.remove("dark");
			return;
		}

		// mode === "system"
		const mm = window.matchMedia("(prefers-color-scheme: dark)");
		const applyNow = async () => {
			el.classList.toggle("dark", mm.matches);
			await setResolvedServer(mm.matches ? "dark" : "light");
		};
		applyNow();

		const onChange = async (e: MediaQueryListEvent) => {
			el.classList.toggle("dark", e.matches);
			await setResolvedServer(e.matches ? "dark" : "light");
		};

		mm.addEventListener?.("change", onChange);
		mm.addListener?.(onChange);

		mmRef.current = mm;
		listenerRef.current = onChange;

		return () => {
			mmRef.current?.removeEventListener?.(
				"change",
				listenerRef.current as EventListener,
			);
			mmRef.current?.removeListener?.(listenerRef.current);
			mmRef.current = null;
			listenerRef.current = null;
		};
	}, [mode]);

	const setTheme = (t: ThemeName) => {
		setThemeState(t);
		document.documentElement.setAttribute("data-theme", t);
		start(async () => {
			await setThemeServer(t);
			router.refresh();
		});
	};

	const setMode = (m: ThemeMode) => {
		setModeState(m);
		const el = document.documentElement;
		if (m === "dark") el.classList.add("dark");
		else if (m === "light") el.classList.remove("dark");
		else {
			const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
			el.classList.toggle("dark", prefers);
			start(() => setResolvedServer(prefers ? "dark" : "light"));
		}
		start(async () => {
			await setModeServer(m);
			router.refresh();
		});
	};

	const value = useMemo(
		() => ({ theme, mode, setTheme, setMode, pending }),
		[theme, mode, pending],
	);

	return <Ctx.Provider value={value}>
        <Toaster theme={mode} expand={true} />
        {children}
    </Ctx.Provider>;
}

export function useAppearance() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useAppearance must be used within <AppearanceProvider>");
	return ctx;
}
