"use client";

import dynamic from "next/dynamic";

import { InspectorPlaceholder } from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

function TextLoading() {
    const dict = useOptionalDictionary();

    return (
        <pre className="h-full w-full overflow-auto p-4 font-mono text-xs">
            {dict?.mailbox?.loadingPlainText ?? "Loading plain text…"}
        </pre>
    );
}

const TextSyntaxHighlighter = dynamic(
    () => import("./text-syntax-highlighter"),
    {
        ssr: true,
        loading: () => <TextLoading />,
    },
);

export default function TextPane({
                                     message,
                                 }: {
    message?: MessageEntity;
}) {
    const dict = useOptionalDictionary();

    return (
        <InspectorPlaceholder
            title={dict?.mailbox?.tabPlainText ?? "Plain text"}
            description={dict?.mailbox?.plainTextDescription ?? "The plain-text version of the email."}
        >
            <div className="h-full w-full min-h-0 overflow-hidden">
                <TextSyntaxHighlighter
                    text={
                        message?.text ??
                        (dict?.mailbox?.noPlainTextVersion ?? "No plain-text version available.")
                    }
                />
            </div>
        </InspectorPlaceholder>
    );
}
