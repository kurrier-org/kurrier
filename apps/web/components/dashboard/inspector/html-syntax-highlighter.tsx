"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type HtmlSyntaxHighlighterProps = {
    html: string;
};

export default function HtmlSyntaxHighlighter({
                                                  html,
                                              }: HtmlSyntaxHighlighterProps) {
    if (!html) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No HTML body available.
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-auto">
            <SyntaxHighlighter
                language="html"
                style={oneDark}
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
                codeTagProps={{
                    style: {
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    },
                }}
            >
                {html}
            </SyntaxHighlighter>
        </div>
    );
}
