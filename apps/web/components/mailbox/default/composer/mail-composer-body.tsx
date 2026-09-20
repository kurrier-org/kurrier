"use client";

import React from "react";
import { RichTextEditor } from "@mantine/tiptap";

type MailComposerBodyProps = {
    signatureHtml?: string;
};

const createPreviewDocument = (
    signatureHtml: string,
) => `<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />

        <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
        />

        <style>
            html,
            body {
                margin: 0;
                padding: 0;
                background: transparent;
                overflow: hidden;
            }

            body {
                color: #111827;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
            }

            img {
                max-width: 100%;
                height: auto;
            }

            table {
                max-width: 100%;
            }
        </style>
    </head>

    <body>
        ${signatureHtml}
    </body>
</html>`;

export default function MailComposerBody({
                                             signatureHtml = "",
                                         }: MailComposerBodyProps) {
    return (
        <div className="min-h-72">
            <RichTextEditor.Content
                className={[
                    "prose max-w-none px-4 pt-4 text-sm leading-5",
                    signatureHtml
                        ? "min-h-[64px] pb-2"
                        : "min-h-72 pb-4"
                ].join(" ")}
            />

            {signatureHtml && (
                <div
                    className="px-4 pb-4"
                    contentEditable={false}
                >
                    <div className="mb-3 w-12 border-t border-neutral-300 dark:border-neutral-700" />

                    <iframe
                        title="Email signature preview"
                        srcDoc={createPreviewDocument(
                            signatureHtml,
                        )}
                        sandbox="allow-same-origin"
                        tabIndex={-1}
                        scrolling="no"
                        className="pointer-events-none block h-20 w-full border-0 bg-transparent"
                        onLoad={(event) => {
                            const frame =
                                event.currentTarget;

                            const frameDocument =
                                frame.contentDocument;

                            if (!frameDocument) {
                                return;
                            }

                            const height = Math.max(
                                frameDocument.body
                                    ?.scrollHeight ?? 0,
                                frameDocument
                                    .documentElement
                                    .scrollHeight,
                            );

                            frame.style.height = `${Math.min(
                                Math.max(height, 48),
                                220,
                            )}px`;
                        }}
                    />
                </div>
            )}
        </div>
    );
}
