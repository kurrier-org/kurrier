"use client";

import dynamic from "next/dynamic";

import { InspectorPlaceholder } from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";

const TextSyntaxHighlighter = dynamic(
    () => import("./text-syntax-highlighter"),
    {
        ssr: true,
        loading: () => (
            <pre className="h-full w-full overflow-auto p-4 font-mono text-xs">
                Loading plain text…
            </pre>
        ),
    },
);

export default function TextPane({
                                     message,
                                 }: {
    message?: MessageEntity;
}) {
    return (
        <InspectorPlaceholder
            title="Plain text"
            description="The plain-text version of the email."
        >
            <div className="h-full w-full min-h-0 overflow-hidden">
                <TextSyntaxHighlighter
                    text={
                        message?.text ??
                        "No plain-text version available."
                    }
                />
            </div>
        </InspectorPlaceholder>
    );
}
