"use client";

import { useMemo } from "react";
import { MantineProvider } from "@mantine/core";
import { useAppearance } from "@/components/providers/appearance-provider";
import { createMantineTheme } from "@/lib/mantine-theme";

export function WorkspaceMantineProvider({ children, }: {
    children: React.ReactNode;
}) {
    const { theme, mode } = useAppearance();

    const { theme: mantineTheme, colorScheme } = useMemo(
        () => createMantineTheme({ theme, mode }),
        [theme, mode],
    );

    return (
        <MantineProvider theme={mantineTheme} defaultColorScheme={colorScheme}>
            {children}
        </MantineProvider>
);
}
