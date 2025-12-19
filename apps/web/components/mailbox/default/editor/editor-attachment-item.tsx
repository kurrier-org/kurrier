"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MessageAttachmentEntity } from "@db";
import { PublicConfig } from "@schema";
import { createClient } from "@/lib/supabase/client";
import { FileText, FileImage, FileVideo, FileAudio, CalendarDays, Paperclip } from "lucide-react";
import mime from "mime-types";

function formatBytes(bytes?: number | null) {
    if (!bytes || bytes <= 0) return null;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function getKind(a: MessageAttachmentEntity) {
    const ct = (a.contentType || "").toLowerCase();
    const name = (a.filenameOriginal || "").toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() || "" : "";
    const guessed = (ext ? String(mime.lookup(ext) || "") : "").toLowerCase();
    const type = ct || guessed;

    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "pdf";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type.includes("text/calendar") || type.includes("application/ics") || ext === "ics") return "calendar";
    if (type.startsWith("text/")) return "text";
    return "file";
}

function KindIcon({ kind }: { kind: string }) {
    if (kind === "image") return <FileImage className="h-4 w-4" />;
    if (kind === "pdf") return <FileText className="h-4 w-4" />;
    if (kind === "video") return <FileVideo className="h-4 w-4" />;
    if (kind === "audio") return <FileAudio className="h-4 w-4" />;
    if (kind === "calendar") return <CalendarDays className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
}

export default function EditorAttachmentItem({
                                                 attachment,
                                                 publicConfig,
                                             }: {
    attachment: MessageAttachmentEntity;
    publicConfig: PublicConfig;
}) {
    const supabase = useMemo(() => createClient(publicConfig), [publicConfig]);

    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const { data } = await supabase.storage
                .from("attachments")
                .createSignedUrl(String(attachment.path), 300);

            if (!cancelled) setUrl(data?.signedUrl || null);
        })();

        return () => {
            cancelled = true;
        };
    }, [attachment.id, attachment.path, supabase]);

    const kind = getKind(attachment);
    const sizeLabel = formatBytes(attachment.sizeBytes);

    const title = attachment.filenameOriginal || "attachment";
    const subtitle = [attachment.contentType || null, sizeLabel].filter(Boolean).join(" · ");

    return (
        <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="group overflow-hidden rounded-2xl border border-neutral-200/70 bg-white transition dark:border-neutral-800 dark:bg-neutral-950"
        >
            <div className="h-44 bg-neutral-50 dark:bg-neutral-900/40 overflow-hidden">
                {url && kind === "image" ? (
                    <img src={url} alt={title} className="h-full w-full object-cover" />
                ) : url && kind === "video" ? (
                    <video src={url} className="h-full w-full object-cover" muted controls={false} />
                ) : url && kind === "audio" ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                            <KindIcon kind={kind} />
                            <span>Audio</span>
                        </div>
                    </div>
                ) : url && kind === "pdf" ? (
                    <iframe
                        src={url}
                        className={"h-full w-full scale-120 overflow-hidden object-cover"}
                        style={{
                            pointerEvents: "none",
                            border: "0",
                        }}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                            <KindIcon kind={kind} />
                            <span className="capitalize">{kind === "file" ? "Attachment" : kind}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3">
                <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                        <KindIcon kind={kind} />
                    </div>

                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:underline">
                            {title}
                        </div>
                        {subtitle ? (
                            <div className="truncate text-xs text-neutral-600 dark:text-neutral-300">
                                {subtitle}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </a>
    );
}
