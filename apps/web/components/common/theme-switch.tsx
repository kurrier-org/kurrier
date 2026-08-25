import { Switch } from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import React, { useEffect, useMemo, useState } from "react";
import { useAppearance } from "@/components/providers/appearance-provider";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

function ThemeSwitch({ onComplete }: { onComplete?: () => void }) {
	const { mode, setMode } = useAppearance();
	const dict = useOptionalDictionary();

	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const prefersDark = useMemo(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}, []);

	const isDark = useMemo(() => {
		if (mode === "dark") return true;
		if (mode === "light") return false;
		return prefersDark; // mode === "system"
	}, [mode, prefersDark]);

	if (!mounted) return null;

	return (
		<Switch
			size="sm"
			checked={!isDark}
			onChange={(e) => {
				setMode(e.currentTarget.checked ? "light" : "dark");
				onComplete && onComplete();
			}}
			onLabel={<IconSun size={16} stroke={2.5} />}
			offLabel={<IconMoonStars size={16} stroke={2.5} />}
			aria-label={
				isDark
					? (dict?.common?.switchToLightMode ?? "Switch to light mode")
					: (dict?.common?.switchToDarkMode ?? "Switch to dark mode")
			}
		/>
	);
}

export default ThemeSwitch;
