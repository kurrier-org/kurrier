"use client";

import React, { useMemo, useState } from "react";
import {
    Check,
    Clipboard,
    Download,
    FileText,
    Paperclip,
} from "lucide-react";

import {
    InspectorPlaceholder,
} from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type RawPaneProps = {
    message?: MessageEntity;
    onDownloadRaw?: () => void | Promise<void>;
};

const MAX_TEXT_PREVIEW_LENGTH = 40_000;

function formatBytes(bytes?: number | null): string {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    );

    const value = bytes / 1024 ** index;

    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: Date | string | null): string {
    if (!value) return "—";

    return new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getAddressText(
    value:
        | {
        text?: string | null;
    }
        | string
        | null
        | undefined,
): string {
    if (!value) return "—";

    if (typeof value === "string") {
        return value;
    }

    return value.text || "—";
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
            .join("\n\t");
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
            const params = Object.entries(
                record.params as Record<string, unknown>,
            )
                .map(
                    ([key, parameterValue]) =>
                        `${key}="${String(parameterValue)}"`,
                )
                .join("; ");

            return params
                ? `${record.value}; ${params}`
                : record.value;
        }

        if (typeof record.value === "string") {
            return record.value;
        }

        return JSON.stringify(value);
    }

    return String(value);
}

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

function createRawPreview(message: MessageEntity): string {
    const headers =
        (message.headersJson as Record<string, unknown> | null) ?? {};

    const preferredOrder = [
        "return-path",
        "delivered-to",
        "received",
        "date",
        "from",
        "reply-to",
        "to",
        "cc",
        "bcc",
        "subject",
        "message-id",
        "in-reply-to",
        "references",
        "mime-version",
        "content-type",
        "list-unsubscribe",
        "list-unsubscribe-post",
        "dkim-signature",
    ];

    const emitted = new Set<string>();
    const headerLines: string[] = [];

    const appendHeader = (
        name: string,
        value: unknown,
    ) => {
        const formatted = formatHeaderValue(value);

        if (!formatted) return;

        const lines = formatted.split("\n");

        headerLines.push(
            `${formatHeaderName(name)}: ${lines[0]}`,
        );

        for (const continuation of lines.slice(1)) {
            headerLines.push(
                continuation.startsWith("\t")
                    ? continuation
                    : `\t${continuation}`,
            );
        }

        emitted.add(name);
    };

    for (const name of preferredOrder) {
        if (name in headers) {
            appendHeader(name, headers[name]);
        }
    }

    for (const [name, value] of Object.entries(headers)) {
        if (!emitted.has(name)) {
            appendHeader(name, value);
        }
    }

    if (!emitted.has("message-id") && message.messageId) {
        appendHeader("message-id", message.messageId);
    }

    if (!emitted.has("subject") && message.subject) {
        appendHeader("subject", message.subject);
    }

    if (!emitted.has("from") && message.from) {
        appendHeader("from", message.from);
    }

    if (!emitted.has("to") && message.to) {
        appendHeader("to", message.to);
    }

    if (!emitted.has("date") && message.date) {
        appendHeader(
            "date",
            new Date(message.date).toUTCString(),
        );
    }

    const contentType = headers["content-type"] as
        | {
        value?: string;
        params?: Record<string, unknown>;
    }
        | undefined;

    const boundary =
        typeof contentType?.params?.boundary === "string"
            ? contentType.params.boundary
            : `kurrier-preview-${message.id}`;

    const text = message.text ?? "";
    const textWasTruncated =
        text.length > MAX_TEXT_PREVIEW_LENGTH;

    const textPreview = textWasTruncated
        ? `${text.slice(
            0,
            MAX_TEXT_PREVIEW_LENGTH,
        )}\n\n[Plain-text body truncated in preview]`
        : text;

    const htmlLength = message.html?.length ?? 0;

    const mimeParts = [
        "",
        `--${boundary}`,
        'Content-Type: text/plain; charset="utf-8"',
        "Content-Transfer-Encoding: 8bit",
        "",
        textPreview || "[No plain-text body]",
        "",
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        "Content-Transfer-Encoding: omitted",
        "",
        htmlLength > 0
            ? `[HTML body omitted from raw preview — ${htmlLength.toLocaleString()} characters. View the HTML tab.]`
            : "[No HTML body]",
    ];

    if (message.hasAttachments) {
        mimeParts.push(
            "",
            `--${boundary}`,
            "Content-Type: application/octet-stream",
            'Content-Disposition: attachment; filename="attachment"',
            "Content-Transfer-Encoding: base64",
            "",
            "[Attachment metadata and encoded body omitted from preview]",
        );
    }

    mimeParts.push("", `--${boundary}--`);

    return [...headerLines, ...mimeParts].join("\n");
}

function SummaryRow({
                        label,
                        children,
                    }: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid min-h-10 grid-cols-[165px_minmax(0,1fr)] border-b border-border/60 last:border-b-0">
            <div className="flex items-center bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                {label}
            </div>

            <div className="min-w-0 px-4 py-2 text-sm">
                {children}
            </div>
        </div>
    );
}

export default function RawPane({
                                    message,
                                    onDownloadRaw,
                                }: RawPaneProps) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const rawPreview = useMemo(() => {
        if (!message) return "";

        return createRawPreview(message);
    }, [message]);

    const copyRawPreview = async () => {
        if (!rawPreview) return;

        await navigator.clipboard.writeText(rawPreview);

        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1_500);
    };

    const downloadRaw = async () => {
        if (!onDownloadRaw) return;

        try {
            setDownloading(true);
            await onDownloadRaw();
        } finally {
            setDownloading(false);
        }
    };

    if (!message) {
        return (
            <InspectorPlaceholder
                title="Raw"
                description="Message source preview with large MIME payloads omitted."
            >
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No message selected.
                </div>
            </InspectorPlaceholder>
        );
    }

    return (
        <InspectorPlaceholder
            title="Raw"
            description="Message source preview with large MIME payloads omitted."
        >
            <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-4">
                <div className="shrink-0 overflow-hidden rounded-xl border bg-card">
                    <SummaryRow label="Message ID">
						<span className="break-all font-mono text-emerald-500">
							{message.messageId || "—"}
						</span>
                    </SummaryRow>

                    <SummaryRow label="Created on">
                        {formatDate(
                            message.date ??
                            message.createdAt,
                        )}
                    </SummaryRow>

                    <SummaryRow label="From">
						<span className="break-all">
							{getAddressText(message.from)}
						</span>
                    </SummaryRow>

                    <SummaryRow label="To">
						<span className="break-all">
							{getAddressText(message.to)}
						</span>
                    </SummaryRow>

                    <SummaryRow label="Subject">
                        {message.subject || "(no subject)"}
                    </SummaryRow>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-[#171717]">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="gap-1.5 border-white/10 bg-white/10 text-zinc-200"
                            >
                                <FileText className="size-3" />
                                Raw preview
                            </Badge>

                            <span className="text-xs text-zinc-500">
				{formatBytes(message.sizeBytes)}
			</span>

                            {message.hasAttachments && (
                                <Badge
                                    variant="outline"
                                    className="gap-1.5 border-white/10 text-zinc-400"
                                >
                                    <Paperclip className="size-3" />
                                    Attachment bodies omitted
                                </Badge>
                            )}

                            {message.rawStorageKey && (
                                <span className="text-xs text-zinc-500">
					Complete .eml stored
				</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-zinc-300 hover:bg-white/10 hover:text-white"
                                onClick={copyRawPreview}
                            >
                                {copied ? (
                                    <Check className="mr-2 size-4" />
                                ) : (
                                    <Clipboard className="mr-2 size-4" />
                                )}

                                {copied ? "Copied" : "Copy preview"}
                            </Button>

                            {message.rawStorageKey && onDownloadRaw && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                                    disabled={downloading}
                                    onClick={downloadRaw}
                                >
                                    <Download className="mr-2 size-4" />
                                    {downloading ? "Downloading…" : "Download .eml"}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto">
                        <SyntaxHighlighter
                            language="http"
                            style={oneDark}
                            wrapLongLines
                            customStyle={{
                                margin: 0,
                                minHeight: "100%",
                                background: "transparent",
                                padding: "1rem",
                                fontSize: "13px",
                                lineHeight: "1.55",
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
                            {rawPreview}
                        </SyntaxHighlighter>
                    </div>
                </div>
            </div>
        </InspectorPlaceholder>
    );
}
