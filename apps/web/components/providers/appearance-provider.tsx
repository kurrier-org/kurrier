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
import { Toaster } from "@/components/ui/sonner";

type AppearanceCtx = {
	theme: ThemeName;
	mode: ThemeMode;
	setTheme: (t: ThemeName) => void;
	setMode: (m: ThemeMode) => void;
	pending: boolean;
	applyColorScheme: (mode: "light" | "dark" | "system") => void;
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

	function applyColorScheme(mode: "light" | "dark" | "system") {
		const el = document.documentElement;
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		const isDark = mode === "dark" || (mode === "system" && prefersDark);

		// Tailwind + your CSS variables
		el.classList.toggle("dark", isDark);

		// Browser controls/scrollbars
		el.style.setProperty("color-scheme", isDark ? "dark" : "light");

		// Mantine components (and many libs) pick this up
		el.setAttribute("data-mantine-color-scheme", isDark ? "dark" : "light");
	}

	const value = useMemo(
		() => ({ theme, mode, setTheme, setMode, pending, applyColorScheme }),
		[theme, mode, pending, applyColorScheme],
	);

	useEffect(() => {
		applyColorScheme(mode);

		// keep it reactive for "system"
		if (mode === "system") {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			const onChange = () => applyColorScheme("system");
			mq.addEventListener?.("change", onChange);
			return () => mq.removeEventListener?.("change", onChange);
		}
	}, [mode]);

	return (
		<Ctx.Provider value={value}>
			<Toaster theme={mode} expand={true} />
			{children}
		</Ctx.Provider>
	);
}

export function useAppearance() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useAppearance must be used within <AppearanceProvider>");
	return ctx;
}
