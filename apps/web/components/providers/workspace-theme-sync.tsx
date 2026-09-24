"use client";

import { useEffect } from "react";
import type { ThemeName } from "@schema/types/themes";
import { useAppearance } from "@/components/providers/appearance-provider";

export default function WorkspaceThemeSync({ theme }: { theme: ThemeName }) {
    const { setWorkspaceTheme } = useAppearance();

    useEffect(() => {
        setWorkspaceTheme(theme);

        return () => setWorkspaceTheme(null);
    }, [theme, setWorkspaceTheme]);

    return null;
}
