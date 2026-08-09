"use client";

import React, { useMemo, useState } from "react";
import { Check, Clipboard, Braces } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import {
    InspectorPlaceholder,
} from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type JsonPaneProps = {
    message?: MessageEntity;
};

function createNormalizedMessageJson(message: MessageEntity) {
    return {
        id: message.id,
        publicId: message.publicId,
        messageId: message.messageId,
        threadId: message.threadId,
        workspaceId: message.workspaceId,
        mailboxId: message.mailboxId,
        ownerId: message.ownerId,

        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        deliveredTo: message.deliveredTo,

        subject: message.subject,
        snippet: message.snippet,
        text: message.text,
        html: message.html,
        textAsHtml: message.textAsHtml,

        date: message.date,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,

        inReplyTo: message.inReplyTo,
        references: message.references,

        priority: message.priority,
        state: message.state,

        seen: message.seen,
        answered: message.answered,
        flagged: message.flagged,
        draft: message.draft,
        hasAttachments: message.hasAttachments,

        sizeBytes: message.sizeBytes,
        rawStorageKey: message.rawStorageKey,

        headers: message.headersJson,
        metaData: message.metaData,
    };
}

export default function JsonPane({
                                     message,
                                 }: JsonPaneProps) {
    const [copied, setCopied] = useState(false);

    const json = useMemo(() => {
        if (!message) return "";

        return JSON.stringify(
            createNormalizedMessageJson(message),
            null,
            2,
        );
    }, [message]);

    const copyJson = async () => {
        if (!json) return;

        await navigator.clipboard.writeText(json);

        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1_500);
    };

    if (!message) {
        return (
            <InspectorPlaceholder
                title="JSON"
                description="The normalized Kurrier message object will be shown here."
            >
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No message selected.
                </div>
            </InspectorPlaceholder>
        );
    }

    return (
        <InspectorPlaceholder
            title="JSON"
            description="The normalized Kurrier message object."
        >
            <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="gap-1.5"
                        >
                            <Braces className="size-3" />
                            Normalized message
                        </Badge>

                        <span className="text-xs text-muted-foreground">
							Parsed database representation
						</span>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyJson}
                    >
                        {copied ? (
                            <Check className="mr-2 size-4" />
                        ) : (
                            <Clipboard className="mr-2 size-4" />
                        )}

                        {copied ? "Copied" : "Copy JSON"}
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-[#171717]">
                    <div className="h-full overflow-auto">
                        <SyntaxHighlighter
                            language="json"
                            style={oneDark}
                            showLineNumbers
                            wrapLongLines
                            customStyle={{
                                margin: 0,
                                minHeight: "100%",
                                background: "transparent",
                                padding: "1rem",
                                fontSize: "13px",
                                lineHeight: "1.55",
                            }}
                            lineNumberStyle={{
                                minWidth: "2.5rem",
                                paddingRight: "1rem",
                                color: "#71717a",
                                userSelect: "none",
                            }}
                            codeTagProps={{
                                style: {
                                    fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                    wordBreak: "break-word",
                                },
                            }}
                        >
                            {json}
                        </SyntaxHighlighter>
                    </div>
                </div>
            </div>
        </InspectorPlaceholder>
    );
}
