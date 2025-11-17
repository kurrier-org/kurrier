import {
	createTheme,
	MantineColorScheme,
	MantineColorsTuple,
	MantineThemeOverride,
} from "@mantine/core";
import type { ThemeMode, ThemeName } from "@schema";
import colors from "tailwindcss/colors";

const pick = (p: Record<string, string>): MantineColorsTuple =>
	[
		p["50"],
		p["100"],
		p["200"],
		p["300"],
		p["400"],
		p["500"],
		p["600"],
		p["700"],
		p["800"],
		p["900"],
	] as unknown as MantineColorsTuple;

const twForTheme: Record<ThemeName, keyof typeof colors> = {
	indigo: "blue",
	violet: "violet",
	teal: "green",
	brand: "neutral",
};

function paletteFor(theme: ThemeName) {
	const brandTW = colors[twForTheme[theme]] as Record<string, string>;
	const grayTW = colors.zinc as Record<string, string>;

	return {
		brand: pick(brandTW),
		gray: pick(grayTW),
		// optional: expose a couple extra Tailwind palettes to Mantine components
		red: pick(colors.red as any),
		yellow: pick(colors.amber as any),
		green: pick(colors.green as any),
		blue: pick(colors.blue as any),
		violet: pick(colors.violet as any),
		teal: pick(colors.teal as any),
	};
}

export const createMantineTheme = ({
	theme,
	mode,
}: {
	theme: ThemeName;
	mode: ThemeMode;
}) => {
	const palettes = paletteFor(theme);

	// MantineThemeOverride is fine here; createTheme returns a frozen theme
	const override: MantineThemeOverride = {
		colors: palettes,
		primaryColor: "brand",
		primaryShade: { light: 6, dark: 4 },
		// defaultRadius: 'md',
		fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
		headings: {
			fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
		},
	};

	return {
		theme: createTheme(override),
		colorScheme: (mode === "system" ? "auto" : mode) as MantineColorScheme,
	};
};
