import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getPublicEnv } from "@schema";
import {
	MODE_COOKIE,
	RESOLVED_COOKIE,
	THEME_COOKIE,
	type ThemeMode,
	ThemeModeSchema,
	type ThemeName,
	ThemeNameSchema,
} from "@schema/types/themes";
import { AppearanceProvider } from "@/components/providers/appearance-provider";
import { ConfigProvider } from "@/components/providers/config-provider";
import { SiteFeaturesProvider } from "@/components/providers/site-features-provider";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import {
	ColorSchemeScript,
	MantineProvider,
	mantineHtmlProps,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { createMantineTheme } from "@/lib/mantine-theme";
import { SITE_FEATURES } from "@/lib/site-features";

const jakartaSans = Plus_Jakarta_Sans({
	variable: "--font-sans",
	subsets: ["latin"],
});
const jetbrains = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Kurrier",
	description: "Mailbox, but nice.",
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const jar = await cookies();
	const theme: ThemeName = ThemeNameSchema.catch("indigo").parse(
		jar.get(THEME_COOKIE)?.value,
	);
	const mode: ThemeMode = ThemeModeSchema.catch("system").parse(
		jar.get(MODE_COOKIE)?.value,
	);

	const resolved = jar.get(RESOLVED_COOKIE)?.value as
		| Partial<ThemeMode>
		| undefined;
	const initialDark =
		mode === "dark" ? true : mode === "light" ? false : resolved === "dark";

	const publicConfig = getPublicEnv();
	const { theme: mantineTheme, colorScheme } = createMantineTheme({
		theme,
		mode,
	});

	return (
		<html
			lang="en"
			data-theme={theme}
			className={`${initialDark ? "dark" : ""}`}
			{...mantineHtmlProps}
		>
			<head>
				<ColorSchemeScript
					defaultColorScheme={colorScheme}
					nonce="8IBTHwOdqNKAWeKl7plt8g=="
				/>
			</head>
			<body
				className={`${jakartaSans.variable} ${jetbrains.variable} font-sans bg-background text-foreground antialiased`}
			>
				<AppearanceProvider initialTheme={theme} initialMode={mode}>
					<ConfigProvider value={publicConfig}>
						<SiteFeaturesProvider value={SITE_FEATURES}>
							<MantineProvider
								theme={mantineTheme}
								defaultColorScheme={colorScheme}
							>
								<ModalsProvider>{children}</ModalsProvider>
							</MantineProvider>
						</SiteFeaturesProvider>
					</ConfigProvider>
				</AppearanceProvider>
			</body>
		</html>
	);
}
