import React, { useMemo } from "react";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { Switch } from "@mantine/core";
import { useAppearance } from "@/components/providers/appearance-provider";

function ThemeSwitch({ onComplete }: { onComplete?: () => void }) {
	const { mode, setMode } = useAppearance();

	const prefersDark = useMemo(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}, []);

	const isDark = useMemo(() => {
		if (mode === "dark") return true;
		if (mode === "light") return false;
		return prefersDark; // mode === "system"
	}, [mode, prefersDark]);

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
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
		/>
	);
}

export default ThemeSwitch;
