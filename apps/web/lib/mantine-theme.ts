import {
	createTheme,
	type MantineColorScheme,
	type MantineColorsTuple,
	type MantineThemeOverride,
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
		red: pick(colors.red),
		yellow: pick(colors.amber),
		green: pick(colors.green),
		blue: pick(colors.blue),
		violet: pick(colors.violet),
		teal: pick(colors.teal),
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
		components: {
			Button: {
				defaultProps: {
					w: { base: "100%", sm: "auto" },
				},
				styles: {
					root: {
						height: "auto",
						minHeight: "var(--button-height)",
					},
					label: {
						whiteSpace: "normal",
						textAlign: "center",
					},
				},
			},
		},
		headings: {
			fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
		},
	};

	return {
		theme: createTheme(override),
		colorScheme: (mode === "system" ? "auto" : mode) as MantineColorScheme,
	};
};
