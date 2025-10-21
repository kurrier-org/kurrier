"use client";

import React from "react";
import { ColorSwatch, Tooltip } from "@mantine/core";
import type { ThemeName } from "@schema/types/themes";
import { useAppearance } from "@/components/providers/appearance-provider";

const THEME_OPTIONS: Array<{ label: string; theme: ThemeName; color: string }> =
	[
		{ label: "Brand", theme: "brand", color: "var(--color-neutral-600)" },
		{ label: "Indigo", theme: "indigo", color: "var(--color-blue-500)" },
		{ label: "Violet", theme: "violet", color: "var(--color-violet-500)" },
		{ label: "Teal", theme: "teal", color: "var(--color-teal-500)" },
	];

function ThemeColorPicker({ onComplete }: { onComplete?: () => void }) {
	const { theme: activeTheme, setTheme, pending } = useAppearance();

	return (
		<div className="flex items-center gap-2">
			{THEME_OPTIONS.map(({ label, theme, color }) => {
				const isActive = activeTheme === theme;
				return (
					<button
						key={theme}
						type="button"
						onClick={() => {
							setTheme(theme);
							onComplete && onComplete();
						}}
						disabled={pending}
						aria-label={`Switch to ${label} theme`}
						aria-pressed={isActive}
						className="p-0 m-0 bg-transparent border-0 rounded-full"
						style={{ lineHeight: 0 }}
					>
						<Tooltip label={label} withArrow>
							<ColorSwatch
								color={color}
								size={16}
								withShadow
								className={`cursor-pointer transition-all ${
									isActive
										? "ring-1 ring-offset-1 ring-[color:var(--color-brand-500)]"
										: ""
								}`}
								// Optional subtle scale for the active one:
								style={{ transform: isActive ? "scale(1.08)" : "scale(1)" }}
							/>
						</Tooltip>
					</button>
				);
			})}
		</div>
	);
}

export default ThemeColorPicker;
