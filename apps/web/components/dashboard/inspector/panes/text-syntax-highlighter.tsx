"use client";

import { useMantineColorScheme } from "@mantine/core";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
    oneDark,
    oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

type TextSyntaxHighlighterProps = {
    text: string;
};

export default function TextSyntaxHighlighter({
                                                  text,
                                              }: TextSyntaxHighlighterProps) {
    const { colorScheme } = useMantineColorScheme();
    const dict = useOptionalDictionary();

    if (!text) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                {dict?.mailbox?.noPlainTextBodyAvailable ?? "No plain-text body available."}
            </div>
        );
    }

    const isDark = colorScheme === "dark";

    return (
        <div className="h-full w-full overflow-auto">
            <SyntaxHighlighter
                language="text"
                style={isDark ? oneDark : oneLight}
                showLineNumbers
                wrapLongLines={false}
                customStyle={{
                    margin: 0,
                    minHeight: "100%",
                    width: "100%",
                    background: "transparent",
                    padding: "1rem",
                    fontSize: "0.75rem",
                    lineHeight: "1.5",
                }}
                lineNumberStyle={{
                    color: isDark
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(0,0,0,0.4)",
                    minWidth: "2.5rem",
                    paddingRight: "1rem",
                }}
                codeTagProps={{
                    style: {
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    },
                }}
            >
                {text}
            </SyntaxHighlighter>
        </div>
    );
}
