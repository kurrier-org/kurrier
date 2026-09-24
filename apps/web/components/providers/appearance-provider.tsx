"use client";

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
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
	setTheme: (theme: ThemeName) => void;
	setWorkspaceTheme: (theme: ThemeName | null) => void;
	setMode: (mode: ThemeMode) => void;
	pending: boolean;
};

const Ctx = createContext<AppearanceCtx | null>(null);

function applyMode(isDark: boolean) {
	const el = document.documentElement;

	el.classList.toggle("dark", isDark);
	el.style.setProperty("color-scheme", isDark ? "dark" : "light");
	el.setAttribute("data-mantine-color-scheme", isDark ? "dark" : "light");
}

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
	const [workspaceTheme, setWorkspaceTheme] = useState<ThemeName | null>(null);
	const [mode, setModeState] = useState<ThemeMode>(initialMode);

	const activeTheme = workspaceTheme ?? theme;

	useEffect(() => {
		setThemeState(initialTheme);
	}, [initialTheme]);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", activeTheme);
	}, [activeTheme]);

	useEffect(() => {
		if (mode === "dark") {
			applyMode(true);
			return;
		}

		if (mode === "light") {
			applyMode(false);
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");

		const syncSystemMode = (isDark: boolean) => {
			applyMode(isDark);
			void setResolvedServer(isDark ? "dark" : "light");
		};

		syncSystemMode(media.matches);

		const onChange = (event: MediaQueryListEvent) => {
			syncSystemMode(event.matches);
		};

		media.addEventListener("change", onChange);

		return () => {
			media.removeEventListener("change", onChange);
		};
	}, [mode]);

	const setTheme = useCallback(
		(nextTheme: ThemeName) => {
			setThemeState(nextTheme);

			if (workspaceTheme === null) {
				document.documentElement.setAttribute("data-theme", nextTheme);
			}

			start(async () => {
				await setThemeServer(nextTheme);
				router.refresh();
			});
		},
		[workspaceTheme, router, start],
	);

	const setMode = useCallback(
		(nextMode: ThemeMode) => {
			setModeState(nextMode);

			const isDark =
				nextMode === "dark" ||
				(nextMode === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);

			applyMode(isDark);

			start(async () => {
				await setModeServer(nextMode);
				router.refresh();
			});
		},
		[router, start],
	);

	const value = useMemo(
		() => ({
			theme: activeTheme,
			mode,
			setTheme,
			setWorkspaceTheme,
			setMode,
			pending,
		}),
		[activeTheme, mode, setTheme, setMode, pending],
	);

	return (
		<Ctx.Provider value={value}>
			<Toaster theme={mode} expand={true} />
			{children}
		</Ctx.Provider>
	);
}

export function useAppearance() {
	const ctx = useContext(Ctx);

	if (!ctx) {
		throw new Error("useAppearance must be used within <AppearanceProvider>");
	}

	return ctx;
}
