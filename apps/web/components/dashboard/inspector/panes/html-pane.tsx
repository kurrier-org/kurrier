"use client";

import dynamic from "next/dynamic";

import { InspectorPlaceholder } from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

function HtmlLoading() {
    const dict = useOptionalDictionary();

    return (
        <pre className="h-full w-full overflow-auto p-4 font-mono text-xs">
			{dict?.mailbox?.loadingHtml ?? "Loading HTML…"}
		</pre>
    );
}

const HtmlSyntaxHighlighter = dynamic(
    () => import("./html-syntax-highlighter"),
    {
        ssr: true,
        loading: () => <HtmlLoading />,
    },
);

export default function HtmlPane({
                                     message,
                                 }: {
    message?: MessageEntity;
}) {
    const dict = useOptionalDictionary();

    return (
        <InspectorPlaceholder
            title={dict?.mailbox?.tabHtml ?? "HTML"}
            description={dict?.mailbox?.htmlDescription ?? "The parsed HTML source of the message."}
        >
            <div className="h-full w-full min-h-0 overflow-hidden">
                {message?.html && <HtmlSyntaxHighlighter html={message?.html ?? ""} />}
            </div>
        </InspectorPlaceholder>
    );
}
