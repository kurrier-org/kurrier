"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ThemeName, ThemeMode } from "@schema/types/themes";
import { setModeServer, setThemeServer } from "@/lib/actions/appearance";

export function ThemeControls() {
	const router = useRouter();
	const [pending, start] = useTransition();

	async function onThemeChange(t: ThemeName) {
		document.documentElement.setAttribute("data-theme", t);
		await setThemeServer(t);
		start(() => router.refresh());
	}

	async function onModeChange(m: ThemeMode) {
		const el = document.documentElement;
		if (m === "dark") el.classList.add("dark");
		else if (m === "light") el.classList.remove("dark");
		else {
			const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
			el.classList.toggle("dark", prefers);
			document.cookie = `kurrier.resolved=${prefers ? "dark" : "light"}; Max-Age=31536000; Path=/; SameSite=Lax`;
		}
		await setModeServer(m);
		start(() => router.refresh());
	}

	return (
		<div className="flex gap-2">
			<select
				onChange={(e) => onThemeChange(e.target.value as ThemeName)}
				disabled={pending}
			>
				<option value="brand">Brand</option>
				<option value="indigo">Indigo</option>
				<option value="violet">Violet</option>
				<option value="teal">Teal</option>
			</select>

			<select
				onChange={(e) => onModeChange(e.target.value as ThemeMode)}
				disabled={pending}
			>
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</div>
	);
}
