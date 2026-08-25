"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
    Badge,
    Button,
    Group,
    Tabs,
} from "@mantine/core";
import {
    Braces,
    Code2,
    Download,
    FileJson,
    FileText,
    History,
    MailSearch,
    ShieldCheck,
    Terminal,
} from "lucide-react";

import type { MessageEntity } from "@db";
import type {
    InspectorView,
} from "@/components/dashboard/inspector/inspector-views";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

export type {
    InspectorView,
} from "@/components/dashboard/inspector/inspector-views";

function getTabLabel(
    dict: ReturnType<typeof useOptionalDictionary>,
    key: string,
    fallback: string,
) {
    const map: Record<string, string | undefined> = {
        preview: dict?.mailbox?.tabPreview,
        html: dict?.mailbox?.tabHtml,
        plain: dict?.mailbox?.tabPlainText,
        raw: dict?.mailbox?.tabRaw,
        headers: dict?.mailbox?.tabHeaders,
        smtp: dict?.mailbox?.tabSmtp,
        json: dict?.mailbox?.tabJson,
        delivery: dict?.mailbox?.tabDelivery,
    };
    return map[key] ?? fallback;
}

function PaneLoading({
                         paneKey,
                         title,
                     }: {
    paneKey: string;
    title: string;
}) {
    const dict = useOptionalDictionary();
    const label = getTabLabel(dict, paneKey, title);
    return (
        <InspectorPlaceholder
            title={label}
            description={`${dict?.mailbox?.loadingPrefix ?? "Loading "}${label.toLowerCase()}${dict?.mailbox?.inspectionDataSuffix ?? " inspection data…"}`}
        >
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                {dict?.mailbox?.loadingEllipsis ?? "Loading…"}
            </div>
        </InspectorPlaceholder>
    );
}

const HtmlPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/html-pane"
            ),
    {
        ssr: true,
        loading: () => <PaneLoading paneKey="html" title="HTML" />,
    },
);

const TextPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/text-pane"
            ),
    {
        ssr: true,
        loading: () => (
            <PaneLoading paneKey="plain" title="Plain text" />
        ),
    },
);

const RawPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/raw-pane"
            ),
    {
        ssr: true,
        loading: () => <PaneLoading paneKey="raw" title="Raw" />,
    },
);

const HeadersPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/headers-pane"
            ),
    {
        ssr: true,
        loading: () => (
            <PaneLoading paneKey="headers" title="Headers" />
        ),
    },
);

const SmtpPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/smtp-pane"
            ),
    {
        ssr: true,
        loading: () => <PaneLoading paneKey="smtp" title="SMTP" />,
    },
);

const JsonPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/json-pane"
            ),
    {
        ssr: true,
        loading: () => <PaneLoading paneKey="json" title="JSON" />,
    },
);

const DeliveryPane = dynamic(
    () =>
        import(
            "@/components/dashboard/inspector/panes/delivery-pane"
            ),
    {
        ssr: true,
        loading: () => (
            <PaneLoading paneKey="delivery" title="Delivery" />
        ),
    },
);

type InspectorBarProps = {
    value?: InspectorView;
    onChange?: (value: InspectorView) => void;
    message?: MessageEntity;

    headerCount?: number;
    hasSmtpData?: boolean;
    hasDeliveryData?: boolean;
    rawSourceAvailable?: boolean;
    isParsed?: boolean;

    onReplay?: () => void;
    onDownloadEml?: () => void;
    onCopyRaw?: () => void;
    onCopyJson?: () => void;
    onRefresh?: () => void;

    children?: React.ReactNode;
};

type InspectorTabDefinition = {
    value: InspectorView;
    label: string;
    icon: React.ReactNode;
};

const inspectorTabs: InspectorTabDefinition[] = [
    {
        value: "preview",
        label: "Preview",
        icon: <MailSearch className="size-4" />,
    },
    {
        value: "html",
        label: "HTML",
        icon: <Code2 className="size-4" />,
    },
    {
        value: "plain",
        label: "Plain text",
        icon: <FileText className="size-4" />,
    },
    {
        value: "raw",
        label: "Raw",
        icon: <Terminal className="size-4" />,
    },
    {
        value: "headers",
        label: "Headers",
        icon: <Braces className="size-4" />,
    },
    {
        value: "smtp",
        label: "SMTP",
        icon: <ShieldCheck className="size-4" />,
    },
    {
        value: "json",
        label: "JSON",
        icon: <FileJson className="size-4" />,
    },
    {
        value: "delivery",
        label: "Delivery",
        icon: <History className="size-4" />,
    },
];

export default function InspectorBar({
                                         value,
                                         onChange,
                                         message,
                                         headerCount = 0,
                                         hasSmtpData = true,
                                         hasDeliveryData = true,
                                         rawSourceAvailable = true,
                                         isParsed = true,
                                         onReplay,
                                         onDownloadEml,
                                         onCopyRaw,
                                         onCopyJson,
                                         onRefresh,
                                         children,
                                     }: InspectorBarProps) {
    const dict = useOptionalDictionary();
    const [internalValue, setInternalValue] = useState<InspectorView>("preview");

    const activeValue = value ?? internalValue;

    const handleChange = (
        nextValue: string | null,
    ) => {
        if (!nextValue) return;

        const next = nextValue as InspectorView;

        if (value === undefined) {
            setInternalValue(next);
        }

        onChange?.(next);
    };

    return (
        <Tabs
            value={activeValue}
            onChange={handleChange}
            keepMounted={false}
        >
            <div className="my-5 overflow-hidden rounded-xl border bg-card ">
                <div className="border-b bg-muted/10">
                    <Tabs.List
                        classNames={{
                            list: [
                                "flex flex-wrap border-0 px-2",
                                "before:hidden",
                            ].join(" "),
                        }}
                    >
                        {inspectorTabs.map((tab) => {
                            const disabled =
                                (tab.value === "smtp" &&
                                    !hasSmtpData) ||
                                (tab.value === "delivery" &&
                                    !hasDeliveryData);

                            return (
                                <Tabs.Tab
                                    key={tab.value}
                                    value={tab.value}
                                    disabled={disabled}
                                    leftSection={tab.icon}
                                    className={[
                                        "h-14 shrink-0 px-4",
                                        "text-muted-foreground",
                                        "transition-colors",
                                        "hover:bg-muted/30",
                                        "data-[active=true]:font-medium",
                                        "data-[active=true]:text-foreground",
                                    ].join(" ")}
                                >
                                    <Group
                                        gap={6}
                                        wrap="nowrap"
                                    >
                                        <span>
                                            {getTabLabel(dict, tab.value, tab.label)}
                                        </span>

                                        {tab.value ===
                                        "headers" &&
                                        headerCount > 0 ? (
                                            <Badge
                                                size="xs"
                                                variant="light"
                                                color="gray"
                                                radius="xl"
                                            >
                                                {headerCount}
                                            </Badge>
                                        ) : null}

                                        {tab.value ===
                                        "delivery" &&
                                        hasDeliveryData ? (
                                            <span className="size-1.5 rounded-full bg-emerald-500" />
                                        ) : null}
                                    </Group>
                                </Tabs.Tab>
                            );
                        })}
                    </Tabs.List>
                </div>

                <div className="flex min-h-12 items-center justify-between gap-4 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className={[
                                    "size-2 shrink-0 rounded-full",
                                    isParsed
                                        ? "bg-emerald-500"
                                        : "bg-amber-500",
                                ].join(" ")}
                            />

                            <span className="truncate">
                                {isParsed
                                    ? (dict?.mailbox?.messageParsedSuccessfully ?? "Message parsed successfully")
                                    : (dict?.mailbox?.messageParsingIncomplete ?? "Message parsing incomplete")}
                            </span>
                        </div>

                        <div className="hidden items-center gap-3 md:flex">
                            <span>
                                {rawSourceAvailable
                                    ? (dict?.mailbox?.rawSourceAvailable ?? "Raw source available")
                                    : (dict?.mailbox?.rawSourceUnavailable ?? "Raw source unavailable")}
                            </span>

                            <span className="text-border">
                                •
                            </span>

                            <span>
                                {Object.keys(message?.headersJson || {}).length} {dict?.mailbox?.headersLabel ?? "headers"}
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            size="xs"
                            variant="default"
                            leftSection={
                                <Download className="size-3.5" />
                            }
                            onClick={onDownloadEml}
                            className="hidden sm:inline-flex"
                        >
                            {dict?.mailbox?.downloadEml ?? "Download .eml"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="min-w-0">
                <Tabs.Panel value="preview">
                    {children}
                </Tabs.Panel>

                <Tabs.Panel
                    value="html"
                    className="my-6 h-full"
                >
                    <HtmlPane message={message} />
                </Tabs.Panel>

                <Tabs.Panel
                    value="plain"
                    className="my-6 h-full"
                >
                    <TextPane message={message} />
                </Tabs.Panel>

                <Tabs.Panel
                    value="raw"
                    className="my-6 h-full"
                >
                    <RawPane
                        message={message}
                        onDownloadRaw={onDownloadEml}
                    />
                </Tabs.Panel>

                <Tabs.Panel
                    value="headers"
                    className="my-6 h-full"
                >
                    <HeadersPane message={message} />
                </Tabs.Panel>

                <Tabs.Panel
                    value="smtp"
                    className="my-6 h-full"
                >
                    <SmtpPane message={message} />
                </Tabs.Panel>

                <Tabs.Panel
                    value="json"
                    className="my-6 h-full"
                >
                    <JsonPane message={message} />
                </Tabs.Panel>

                <Tabs.Panel
                    value="delivery"
                    className="my-6 h-full"
                >
                    <DeliveryPane message={message} />
                </Tabs.Panel>
            </div>
        </Tabs>
    );
}

export function InspectorPlaceholder({
                                         title,
                                         description,
                                         children,
                                     }: {
    title: string;
    description: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card p-6">
            <div className="text-base font-semibold">
                {title}
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
                {description}
            </div>

            {children ? (
                <div className="mt-5">
                    {children}
                </div>
            ) : null}
        </div>
    );
}
