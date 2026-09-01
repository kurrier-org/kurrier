import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import "../globals.css";

import { getPublicEnv } from "@schema";

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
import { DISTRIBUTION_CONFIG } from "@distribution/config";

const jakartaSans = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["cyrillic-ext", "latin"],
});

const jetbrains = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["cyrillic", "latin"],
});

export const metadata: Metadata = {
    title: "Kurrier",
    description: "Mailbox, but nice.",
};

export default function LandingLayout({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    const theme = "indigo" as const;
    const mode = "system" as const;

    const publicConfig = getPublicEnv();

    const { theme: mantineTheme, colorScheme } = createMantineTheme({
        theme,
        mode,
    });

    return (
        <html
            lang={DISTRIBUTION_CONFIG.defaultLocale}
            data-theme={theme}
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
        <AppearanceProvider
            initialTheme={theme}
            initialMode={mode}
        >
            <ConfigProvider value={publicConfig}>
                <SiteFeaturesProvider
                    value={DISTRIBUTION_CONFIG.features}
                >
                    <MantineProvider
                        theme={mantineTheme}
                        defaultColorScheme={colorScheme}
                    >
                        <ModalsProvider>
                            {children}
                        </ModalsProvider>
                    </MantineProvider>
                </SiteFeaturesProvider>
            </ConfigProvider>
        </AppearanceProvider>
        </body>
        </html>
    );
}
