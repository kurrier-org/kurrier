"use client";

import React, { useMemo, useState } from "react";
import {
    Check,
    Clipboard,
    MailCheck,
    Route,
    Server,
    ShieldCheck,
} from "lucide-react";

import {
    InspectorPlaceholder,
} from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOptionalI18n } from "@/components/providers/dictionary-provider";

type Dict = NonNullable<ReturnType<typeof useOptionalI18n>>["dict"] | null | undefined;

type SmtpPaneProps = {
    message?: MessageEntity;
};

type SmtpHop = {
    index: number;
    value: string;
};

type SmtpDetail = {
    label: string;
    value: string;
};

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

        if (typeof record.value === "string") {
            const params =
                record.params &&
                typeof record.params === "object"
                    ? Object.entries(
                        record.params as Record<string, unknown>,
                    )
                        .map(
                            ([key, paramValue]) =>
                                `${key}="${String(paramValue)}"`,
                        )
                        .join("; ")
                    : "";

            return params
                ? `${record.value}; ${params}`
                : record.value;
        }

        return JSON.stringify(value, null, 2);
    }

    return String(value);
}

function getHeader(
    headers: Record<string, unknown>,
    name: string,
): string {
    return formatHeaderValue(headers[name]);
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

function createSmtpData(message: MessageEntity, dict: Dict) {
    const headers =
        (message.headersJson as Record<string, unknown> | null) ?? {};

    const receivedRaw = headers.received;
    const received = Array.isArray(receivedRaw)
        ? receivedRaw.map((value) => formatHeaderValue(value))
        : receivedRaw
            ? [formatHeaderValue(receivedRaw)]
            : [];

    const hops: SmtpHop[] = received
        .filter(Boolean)
        .map((value, index) => ({
            index: index + 1,
            value,
        }));

    const notAvailable = dict?.mailbox?.notAvailable ?? "Not available";

    const details: SmtpDetail[] = [
        {
            label: dict?.mailbox?.envelopeSender ?? "Envelope sender",
            value:
                getHeader(headers, "return-path") ||
                "—",
        },
        {
            label: dict?.mailbox?.deliveredTo ?? "Delivered to",
            value:
                getHeader(headers, "delivered-to") ||
                getAddressText(message.to),
        },
        {
            label: dict?.mailbox?.from ?? "From",
            value: getAddressText(message.from),
        },
        {
            label: dict?.mailbox?.replyTo ?? "Reply-To",
            value:
                getHeader(headers, "reply-to") ||
                getAddressText(message?.replyTo as { text?: string | null }),
        },
        {
            label: dict?.mailbox?.messageId ?? "Message ID",
            value: message.messageId || "—",
        },
        {
            label: dict?.mailbox?.mimeVersion ?? "MIME version",
            value:
                getHeader(headers, "mime-version") ||
                "—",
        },
        {
            label: dict?.mailbox?.contentType ?? "Content type",
            value:
                getHeader(headers, "content-type") ||
                "—",
        },
    ];

    const security: SmtpDetail[] = [
        {
            label: dict?.mailbox?.dkim ?? "DKIM",
            value:
                getHeader(headers, "dkim-signature") ||
                notAvailable,
        },
        {
            label: dict?.mailbox?.spamResult ?? "Spam result",
            value:
                getHeader(headers, "x-spamd-result") ||
                notAvailable,
        },
        {
            label: dict?.mailbox?.spamAction ?? "Spam action",
            value:
                getHeader(headers, "x-rspamd-action") ||
                notAvailable,
        },
        {
            label: dict?.mailbox?.queueId ?? "Queue ID",
            value:
                getHeader(headers, "x-rspamd-queue-id") ||
                notAvailable,
        },
        {
            label: dict?.mailbox?.filteringServer ?? "Filtering server",
            value:
                getHeader(headers, "x-rspamd-server") ||
                notAvailable,
        },
    ];

    const text = [
        "SMTP DELIVERY",
        "",
        ...details.map(
            (item) => `${item.label}: ${item.value}`,
        ),
        "",
        "RECEIVED HOPS",
        "",
        ...hops.flatMap((hop) => [
            `Hop ${hop.index}`,
            hop.value,
            "",
        ]),
        "SECURITY",
        "",
        ...security.map(
            (item) => `${item.label}: ${item.value}`,
        ),
    ].join("\n");

    return {
        hops,
        details,
        security,
        text,
    };
}

function DetailRow({
                       label,
                       value,
                       monospace = true,
                   }: {
    label: string;
    value: string;
    monospace?: boolean;
}) {
    return (
        <div className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-border/60 last:border-b-0">
            <div className="bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
                {label}
            </div>

            <div
                className={[
                    "min-w-0 whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-5",
                    monospace ? "font-mono" : "",
                ].join(" ")}
            >
                {value}
            </div>
        </div>
    );
}

export default function SmtpPane({
                                     message,
                                 }: SmtpPaneProps) {
    const i18n = useOptionalI18n();
    const dict = i18n?.dict;
    const format = i18n?.format;
    const [copied, setCopied] = useState(false);

    const smtpData = useMemo(() => {
        if (!message) return null;

        return createSmtpData(message, dict);
    }, [message, dict]);

    const copySmtpData = async () => {
        if (!smtpData) return;

        await navigator.clipboard.writeText(
            smtpData.text,
        );

        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1_500);
    };

    if (!message || !smtpData) {
        return (
            <InspectorPlaceholder
                title={dict?.mailbox?.tabSmtp ?? "SMTP"}
                description={dict?.mailbox?.smtpPlaceholder ?? "SMTP delivery and transport information will be shown here."}
            >
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {dict?.mailbox?.noMessageSelected ?? "No message selected."}
                </div>
            </InspectorPlaceholder>
        );
    }

    return (
        <InspectorPlaceholder
            title={dict?.mailbox?.tabSmtp ?? "SMTP"}
            description={dict?.mailbox?.smtpDescription ?? "Delivery route, envelope and mail authentication details."}
        >
            <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto p-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="gap-1.5"
                        >
                            <Route className="size-3" />
                            {format?.message(smtpData.hops.length, dict?.mailbox?.deliveryHopsCount ?? { other: "{count} delivery hops" }) ?? `${smtpData.hops.length} delivery hops` }
                        </Badge>

                        <Badge
                            variant="outline"
                            className="gap-1.5"
                        >
                            <MailCheck className="size-3" />
                            {dict?.mailbox?.smtpReceived ?? "SMTP received"}
                        </Badge>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copySmtpData}
                    >
                        {copied ? (
                            <Check className="mr-2 size-4" />
                        ) : (
                            <Clipboard className="mr-2 size-4" />
                        )}

                        {copied
                            ? (dict?.mailbox?.copied ?? "Copied")
                            : (dict?.mailbox?.copySmtpDetails ?? "Copy SMTP details")}
                    </Button>
                </div>

                <section className="shrink-0">
                    <div className="mb-2 flex items-center gap-2">
                        <Server className="size-4 text-muted-foreground" />

                        <h3 className="text-sm font-semibold">
                            {dict?.mailbox?.envelopeAndMessage ?? "Envelope and message"}
                        </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-card">
                        {smtpData.details.map((item) => (
                            <DetailRow
                                key={item.label}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </section>

                <section className="shrink-0">
                    <div className="mb-2 flex items-center gap-2">
                        <Route className="size-4 text-muted-foreground" />

                        <h3 className="text-sm font-semibold">
                            {dict?.mailbox?.deliveryRoute ?? "Delivery route"}
                        </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-card">
                        {smtpData.hops.length > 0 ? (
                            smtpData.hops.map((hop) => (
                                <div
                                    key={hop.index}
                                    className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-border/60 last:border-b-0"
                                >
                                    <div className="bg-muted/40 px-4 py-3">
                                        <div className="flex items-center gap-2">
											<span className="flex size-6 items-center justify-center rounded-full border bg-background text-xs font-semibold">
												{hop.index}
											</span>

                                            <span className="text-sm font-medium text-muted-foreground">
												{dict?.mailbox?.received ?? "Received"}
											</span>
                                        </div>
                                    </div>

                                    <pre className="min-w-0 whitespace-pre-wrap break-words px-4 py-3 font-mono text-[13px] leading-5">
										{hop.value}
									</pre>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-sm text-muted-foreground">
                                {dict?.mailbox?.noReceivedHeaders ?? "No Received headers are available."}
                            </div>
                        )}
                    </div>
                </section>

                <section className="shrink-0">
                    <div className="mb-2 flex items-center gap-2">
                        <ShieldCheck className="size-4 text-muted-foreground" />

                        <h3 className="text-sm font-semibold">
                            {dict?.mailbox?.authenticationAndFiltering ?? "Authentication and filtering"}
                        </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-card">
                        {smtpData.security.map((item) => (
                            <DetailRow
                                key={item.label}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </InspectorPlaceholder>
    );
}
