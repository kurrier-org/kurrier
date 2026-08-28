"use client";

import React, { useMemo } from "react";
import {
    CheckCircle2,
    Clock3,
    Database,
    Inbox,
    Route,
} from "lucide-react";

import {
    InspectorPlaceholder,
} from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";
import { Badge } from "@/components/ui/badge";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { formatPolishCount } from "@/lib/locale-format";

type Dict = ReturnType<typeof useOptionalDictionary>;

type DeliveryPaneProps = {
    message?: MessageEntity;
};

type DeliveryEvent = {
    id: string;
    title: string;
    description: string;
    date: Date | null;
    status: "success" | "neutral";
    icon: React.ComponentType<{
        className?: string;
    }>;
    details?: string;
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
            return record.value;
        }

        return JSON.stringify(value);
    }

    return String(value);
}

function parseReceivedDate(received: string): Date | null {
    const finalSemicolon = received.lastIndexOf(";");

    if (finalSemicolon === -1) {
        return null;
    }

    const rawDate = received
        .slice(finalSemicolon + 1)
        .replace(/\([^)]*\)\s*$/, "")
        .trim();

    const parsed = new Date(rawDate);

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
}

function parseReceivedServer(received: string, dict: Dict): string | null {
    const fromMatch = received.match(
        /\bfrom\s+([^\s(]+)/i,
    );
    const byMatch = received.match(
        /\bby\s+([^\s(]+)/i,
    );

    if (fromMatch?.[1] && byMatch?.[1]) {
        return `${fromMatch[1]} → ${byMatch[1]}`;
    }

    if (byMatch?.[1]) {
        return `${dict?.mailbox?.receivedByPrefix ?? "Received by "}${byMatch[1]}`;
    }

    if (fromMatch?.[1]) {
        return `${dict?.mailbox?.receivedFromPrefix ?? "Received from "}${fromMatch[1]}`;
    }

    return null;
}

function formatEventDate(date: Date | null, dict: Dict): string {
    if (!date) return dict?.mailbox?.timeUnavailable ?? "Time unavailable";

    return new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date);
}

function formatEventTime(date: Date | null): string {
    if (!date) return "—";

    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(date);
}

function createDeliveryEvents(
    message: MessageEntity,
    dict: Dict,
): DeliveryEvent[] {
    const headers =
        (message.headersJson as Record<string, unknown> | null) ?? {};

    const receivedHeader = headers.received;

    const receivedValues = (
        Array.isArray(receivedHeader)
            ? receivedHeader.map((value) =>
                formatHeaderValue(value),
            )
            : receivedHeader
                ? [formatHeaderValue(receivedHeader)]
                : []
    ).filter(Boolean);

    const events: DeliveryEvent[] = [];

    /*
     * The Date header is supplied by the sender. It is useful context,
     * but it is not necessarily proof of SMTP acceptance.
     */
    if (message.date) {
        events.push({
            id: "message-date",
            title: dict?.mailbox?.messageTimestamp ?? "Message timestamp",
            description:
                dict?.mailbox?.messageTimestampDescription ?? "The sender-declared Date header of the message.",
            date: new Date(message.date),
            status: "neutral",
            icon: Clock3,
        });
    }


    const chronologicalReceived = receivedValues
        .slice()
        .reverse();

    chronologicalReceived.forEach((received, index) => {
        const isLastHop =
            index === chronologicalReceived.length - 1;

        events.push({
            id: `received-${index}`,
            title: isLastHop
                ? (dict?.mailbox?.messageDelivered ?? "Message delivered")
                : (dict?.mailbox?.messageRelayed ?? "Message relayed"),
            description:
                parseReceivedServer(received, dict) ??
                (dict?.mailbox?.messagePassedThroughSmtp ?? "The message passed through an SMTP server."),
            date: parseReceivedDate(received),
            status: "success",
            icon: isLastHop ? Inbox : Route,
            details: received,
        });
    });


    if (message.createdAt) {
        events.push({
            id: "stored",
            title: dict?.mailbox?.messageIndexedByKurrier ?? "Message indexed by Kurrier",
            description:
                dict?.mailbox?.messageIndexedDescription ?? "Kurrier synchronized, parsed and stored the message.",
            date: new Date(message.createdAt),
            status: "success",
            icon: Database,
        });
    }

    return events;
}

function DeliveryEventRow({
                              event,
                              isLast,
                          }: {
    event: DeliveryEvent;
    isLast: boolean;
}) {
    const dict = useOptionalDictionary();
    const Icon = event.icon;

    return (
        <div className="relative grid grid-cols-[28px_minmax(0,1fr)_auto] gap-4">
            <div className="relative flex justify-center">
                <div
                    className={[
                        "relative z-10 flex size-7 items-center justify-center rounded-full border",
                        event.status === "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-border bg-background text-muted-foreground",
                    ].join(" ")}
                >
                    <Icon className="size-3.5" />
                </div>

                {!isLast && (
                    <div className="absolute left-1/2 top-7 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-border" />
                )}
            </div>

            <div className="min-w-0 pb-7">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">
                        {event.title}
                    </h3>

                    {event.status === "success" && (
                        <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                        >
                            <CheckCircle2 className="mr-1 size-3" />
                            {dict?.common?.success ?? "Success"}
                        </Badge>
                    )}
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                    {event.description}
                </p>

                {event.details && (
                    <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            {dict?.mailbox?.showSmtpDetails ?? "Show SMTP details"}
                        </summary>

                        <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-5">
							{event.details}
						</pre>
                    </details>
                )}
            </div>

            <div
                className="shrink-0 pl-4 text-right"
                title={formatEventDate(event.date, dict)}
            >
                <div className="font-mono text-xs text-muted-foreground">
                    {formatEventTime(event.date)}
                </div>

                {event.date && (
                    <div className="mt-1 text-[11px] text-muted-foreground/70">
                        {new Intl.DateTimeFormat(undefined, {
                            day: "2-digit",
                            month: "short",
                        }).format(event.date)}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DeliveryPane({
                                         message,
                                     }: DeliveryPaneProps) {
    const dict = useOptionalDictionary();
    const events = useMemo(() => {
        if (!message) return [];

        return createDeliveryEvents(message, dict);
    }, [message, dict]);

    if (!message) {
        return (
            <InspectorPlaceholder
                title={dict?.mailbox?.tabDelivery ?? "Delivery"}
                description={dict?.mailbox?.deliveryTimelinePlaceholder ?? "The message delivery timeline will be shown here."}
            >
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {dict?.mailbox?.noMessageSelected ?? "No message selected."}
                </div>
            </InspectorPlaceholder>
        );
    }

    return (
        <InspectorPlaceholder
            title={dict?.mailbox?.tabDelivery ?? "Delivery"}
            description={dict?.mailbox?.deliveryTimelineDescription ?? "The message delivery timeline from sender to Kurrier."}
        >
            <div className="h-full min-h-0 w-full overflow-auto p-4">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                    <Badge
                        variant="secondary"
                        className="gap-1.5"
                    >
                        <Route className="size-3" />
                        {dict?.locale === "pl"
                            ? formatPolishCount(
                                    dict.locale,
                                    events.length,
                                    { one: "zdarzenie dostarczenia", few: "zdarzenia dostarczenia", many: "zdarzeń dostarczenia" },
                                    "delivery events",
                                )
                            : `${events.length} ${dict?.mailbox?.deliveryLabel ?? "delivery"} ${events.length === 1 ? (dict?.mailbox?.event ?? "event") : (dict?.mailbox?.eventsPlural ?? "events")}` }
                    </Badge>

                    {message.rawStorageKey && (
                        <span className="text-xs text-muted-foreground">
							{dict?.mailbox?.rawSourceRetained ?? "Raw source retained"}
						</span>
                    )}
                </div>

                {events.length > 0 ? (
                    <div className="rounded-xl border bg-card p-5">
                        {events.map((event, index) => (
                            <DeliveryEventRow
                                key={event.id}
                                event={event}
                                isLast={
                                    index ===
                                    events.length - 1
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card p-8 text-sm text-muted-foreground">
                        {dict?.mailbox?.noDeliveryInformation ?? "No delivery information is available for this message."}
                    </div>
                )}
            </div>
        </InspectorPlaceholder>
    );
}
