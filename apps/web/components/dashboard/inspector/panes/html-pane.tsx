"use client";

import dynamic from "next/dynamic";

import { InspectorPlaceholder } from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";

const HtmlSyntaxHighlighter = dynamic(
    () => import("./html-syntax-highlighter"),
    {
        ssr: true,
        loading: () => (
            <pre className="h-full w-full overflow-auto p-4 font-mono text-xs">
				Loading HTML…
			</pre>
        ),
    },
);

export default function HtmlPane({
                                     message,
                                 }: {
    message?: MessageEntity;
}) {
    return (
        <InspectorPlaceholder
            title="HTML"
            description="The parsed HTML source of the message."
        >
            <div className="h-full w-full min-h-0 overflow-hidden">
                {message?.html && <HtmlSyntaxHighlighter html={message?.html ?? ""} />}
            </div>
        </InspectorPlaceholder>
    );
}
