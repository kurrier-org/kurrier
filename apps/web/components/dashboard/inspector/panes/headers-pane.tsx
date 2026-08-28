"use client";

import React, { useMemo, useState } from "react";
import { Check, Clipboard } from "lucide-react";

import {
    InspectorPlaceholder,
} from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { formatPolishCount } from "@/lib/locale-format";

type HeadersPaneProps = {
    message?: MessageEntity;
};

type HeaderRow = {
    name: string;
    value: string;
};

function formatHeaderName(name: string): string {
    return name
        .split("-")
        .map((part) => {
            if (!part) return part;

            return (
                part.charAt(0).toUpperCase() +
                part.slice(1).toLowerCase()
            );
        })
        .join("-");
}

function formatHeaderValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => formatHeaderValue(item))
            .filter(Boolean)
            .join("\n");
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;

        if (typeof record.text === "string") {
            return record.text;
        }

        if (
            typeof record.value === "string" &&
            record.params &&
            typeof record.params === "object"
        ) {
            const parameters = Object.entries(
                record.params as Record<string, unknown>,
            )
                .map(
                    ([key, parameterValue]) =>
                        `${key}="${String(parameterValue)}"`,
                )
                .join("; ");

            return parameters
                ? `${record.value}; ${parameters}`
                : record.value;
        }

        if (typeof record.value === "string") {
            return record.value;
        }

        return JSON.stringify(value, null, 2);
    }

    return String(value);
}

function createHeaderRows(message: MessageEntity): HeaderRow[] {
    const headers =
        (message.headersJson as Record<string, unknown> | null) ?? {};

    const preferredOrder = [
        "message-id",
        "date",
        "from",
        "reply-to",
        "to",
        "cc",
        "bcc",
        "subject",
        "return-path",
        "delivered-to",
        "received",
        "in-reply-to",
        "references",
        "mime-version",
        "content-type",
        "content-transfer-encoding",
        "list-id",
        "list-unsubscribe",
        "list-unsubscribe-post",
        "dkim-signature",
    ];

    const rows: HeaderRow[] = [];
    const emitted = new Set<string>();

    const addHeader = (
        name: string,
        value: unknown,
    ) => {
        const formatted = formatHeaderValue(value);

        if (!formatted) return;

        rows.push({
            name: formatHeaderName(name),
            value: formatted,
        });

        emitted.add(name);
    };

    for (const name of preferredOrder) {
        if (name in headers) {
            addHeader(name, headers[name]);
        }
    }

    for (const [name, value] of Object.entries(headers)) {
        if (!emitted.has(name)) {
            addHeader(name, value);
        }
    }

    if (!emitted.has("message-id") && message.messageId) {
        addHeader("message-id", message.messageId);
    }

    if (!emitted.has("date") && message.date) {
        addHeader(
            "date",
            new Date(message.date).toUTCString(),
        );
    }

    if (!emitted.has("from") && message.from) {
        addHeader("from", message.from);
    }

    if (!emitted.has("to") && message.to) {
        addHeader("to", message.to);
    }

    if (!emitted.has("cc") && message.cc) {
        addHeader("cc", message.cc);
    }

    if (!emitted.has("bcc") && message.bcc) {
        addHeader("bcc", message.bcc);
    }

    if (!emitted.has("subject") && message.subject) {
        addHeader("subject", message.subject);
    }

    if (!emitted.has("in-reply-to") && message.inReplyTo) {
        addHeader("in-reply-to", message.inReplyTo);
    }

    if (!emitted.has("references") && message.references) {
        addHeader("references", message.references);
    }

    return rows;
}

function HeaderRowView({
                           name,
                           value,
                       }: HeaderRow) {
    return (
        <div className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-border/60 last:border-b-0">
            <div className="bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
                {name}
            </div>

            <div className="min-w-0 px-4 py-3">
				<pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-5 text-foreground">
					{value}
				</pre>
            </div>
        </div>
    );
}

export default function HeadersPane({
                                        message,
                                    }: HeadersPaneProps) {
    const dict = useOptionalDictionary();
    const [copied, setCopied] = useState(false);

    const rows = useMemo(() => {
        if (!message) return [];

        return createHeaderRows(message);
    }, [message]);

    const copyHeaders = async () => {
        const text = rows
            .map(({ name, value }) => {
                const lines = value.split("\n");

                return [
                    `${name}: ${lines[0]}`,
                    ...lines
                        .slice(1)
                        .map((line) => `\t${line}`),
                ].join("\n");
            })
            .join("\n");

        await navigator.clipboard.writeText(text);

        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1_500);
    };

    if (!message) {
        return (
            <InspectorPlaceholder
                title={dict?.mailbox?.tabHeaders ?? "Headers"}
                description={dict?.mailbox?.headersPlaceholder ?? "Parsed message headers will be shown here."}
            >
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {dict?.mailbox?.noMessageSelected ?? "No message selected."}
                </div>
            </InspectorPlaceholder>
        );
    }

    return (
        <InspectorPlaceholder
            title={dict?.mailbox?.tabHeaders ?? "Headers"}
            description={dict?.mailbox?.headersDescription ?? "Parsed message headers from the original message."}
        >
            <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            {formatPolishCount(
                                dict?.locale,
                                rows.length,
                                { one: "nagłówek", few: "nagłówki", many: "nagłówków" },
                                dict?.mailbox?.headersLabel ?? "headers",
                            )}
                        </Badge>

                        <span className="text-xs text-muted-foreground">
							{dict?.mailbox?.valuesShownAsParsed ?? "Values are shown exactly as parsed where available."}
						</span>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyHeaders}
                    >
                        {copied ? (
                            <Check className="mr-2 size-4" />
                        ) : (
                            <Clipboard className="mr-2 size-4" />
                        )}

                        {copied ? (dict?.mailbox?.copied ?? "Copied") : (dict?.mailbox?.copyHeaders ?? "Copy headers")}
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card">
                    {rows.length > 0 ? (
                        rows.map((row, index) => (
                            <HeaderRowView
                                key={`${row.name}-${index}`}
                                {...row}
                            />
                        ))
                    ) : (
                        <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                            {dict?.mailbox?.noParsedHeadersAvailable ?? "No parsed headers available."}
                        </div>
                    )}
                </div>
            </div>
        </InspectorPlaceholder>
    );
}
