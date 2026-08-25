import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "../globals.css";
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
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { DictionaryProvider } from "@/components/providers/dictionary-provider";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { DAYJS_LOCALES } from "@/lib/locale";
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
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale: urlLocale } = await params;
	// The [locale] URL segment is the canonical source of truth. proxy.ts
	// already validates/redirects to a known locale before any route here
	// ever matches, so this fallback is just defensive.
	const lang = hasLocale(urlLocale) ? urlLocale : "en";
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
	const dict = await getDictionary(lang);

	return (
		<html
			lang={lang}
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
								<DatesProvider settings={{ locale: DAYJS_LOCALES[lang] }}>
									<DictionaryProvider dict={dict}>
										<ModalsProvider>{children}</ModalsProvider>
									</DictionaryProvider>
								</DatesProvider>
							</MantineProvider>
						</SiteFeaturesProvider>
					</ConfigProvider>
				</AppearanceProvider>
			</body>
		</html>
	);
}
