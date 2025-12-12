"use client";

import React from "react";
import type { DriveEntryEntity } from "@db";
import {
    IconFolder,
    IconFile,
    IconFileText,
    IconFileTypePdf,
    IconPhoto,
    IconMusic,
    IconVideo,
    IconArchive,
    IconFileSpreadsheet,
    IconFileTypeDoc,
    IconFileTypePpt,
    IconCode,
    IconDotsVertical,
} from "@tabler/icons-react";

export default function DriveEntry({ entry }: { entry: DriveEntryEntity }) {
    return <DriveTile entry={entry} />;
}

function DriveTile({ entry }: { entry: DriveEntryEntity }) {
    const meta = entry.metaData as any;
    const lastModified = meta?.lastModified ?? null;
    const ext = guessExt(entry);
    const { Icon, badge } = pickIconAndBadge(entry, ext);

    return (
        <div className="group w-[260px]">
            <div className="rounded-2xl border border-neutral-200 bg-white transition hover:shadow-xs dark:border-neutral-800 dark:bg-neutral-950">
                <div className="relative h-[150px] overflow-hidden rounded-t-2xl bg-neutral-50 dark:bg-neutral-900">
                    <div className="absolute left-3 top-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-neutral-200 text-neutral-700 dark:bg-neutral-950/70 dark:border-neutral-800 dark:text-neutral-200">
                            <Icon className="h-5 w-5" />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="absolute right-2 top-2 rounded-xl p-2 text-neutral-600 opacity-0 transition hover:bg-white/70 group-hover:opacity-100 dark:text-neutral-300 dark:hover:bg-neutral-950/60"
                        aria-label="More actions"
                    >
                        <IconDotsVertical className="h-5 w-5" />
                    </button>

                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white border border-neutral-200 text-neutral-700 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-200">
                            <Icon className="h-9 w-9" />
                        </div>
                    </div>

                    {badge ? (
                        <div className="absolute bottom-3 left-3">
              <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                {badge}
              </span>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {entry.name}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="truncate">{secondaryLabel(entry, ext)}</span>
                            <Dot />
                            <span className="tabular-nums">{formatBytes(entry.sizeBytes ?? 0)}</span>
                            {lastModified ? (
                                <>
                                    <Dot />
                                    <span className="truncate">{formatLastModified(lastModified)}</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Dot() {
    return <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />;
}

function guessExt(entry: DriveEntryEntity) {
    const name = (entry.name ?? "").toLowerCase();
    const idx = name.lastIndexOf(".");
    if (idx <= 0 || idx === name.length - 1) return null;
    const ext = name.slice(idx + 1);
    if (!/^[a-z0-9]+$/.test(ext)) return null;
    return ext;
}

function cleanMime(mime: string) {
    const main = mime.split(";")[0]?.trim() ?? "";
    return main || mime;
}

function secondaryLabel(entry: DriveEntryEntity, ext: string | null) {
    if (entry.type === "folder") return "Folder";
    if (entry.mimeType) return cleanMime(entry.mimeType);
    if (ext) return `${ext.toUpperCase()} file`;
    return "File";
}

function pickIconAndBadge(entry: DriveEntryEntity, ext: string | null) {
    if (entry.type === "folder") return { Icon: IconFolder, badge: "" };

    const mime = cleanMime(entry.mimeType ?? "").toLowerCase();

    if (mime.includes("pdf") || ext === "pdf") return { Icon: IconFileTypePdf, badge: "PDF" };
    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "heic"].includes(ext ?? "")) {
        return { Icon: IconPhoto, badge: "Image" };
    }
    if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext ?? "")) {
        return { Icon: IconMusic, badge: "Audio" };
    }
    if (mime.startsWith("video/") || ["mp4", "mov", "mkv", "webm", "avi"].includes(ext ?? "")) {
        return { Icon: IconVideo, badge: "Video" };
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext ?? "")) return { Icon: IconArchive, badge: "Archive" };

    if (["csv", "xls", "xlsx"].includes(ext ?? "")) return { Icon: IconFileSpreadsheet, badge: "Sheet" };
    if (["doc", "docx"].includes(ext ?? "")) return { Icon: IconFileTypeDoc, badge: "Doc" };
    if (["ppt", "pptx"].includes(ext ?? "")) return { Icon: IconFileTypePpt, badge: "Slides" };

    if (
        mime.includes("json") ||
        mime.includes("javascript") ||
        mime.includes("typescript") ||
        mime.includes("xml") ||
        mime.includes("yaml") ||
        mime.includes("x-yaml") ||
        ["js", "ts", "tsx", "jsx", "json", "yml", "yaml", "xml", "toml", "env", "sql", "md", "py", "go", "rs", "java", "kt", "c", "cpp", "h", "swift", "php"].includes(ext ?? "")
    ) {
        return { Icon: IconCode, badge: "Code" };
    }

    if (mime.startsWith("text/") || ["txt", "md", "rtf"].includes(ext ?? "")) return { Icon: IconFileText, badge: "Text" };

    return { Icon: IconFile, badge: ext ? ext.toUpperCase() : "" };
}

function formatBytes(n: number) {
    if (!Number.isFinite(n) || n <= 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    const digits = i === 0 ? 0 : v < 10 ? 1 : 0;
    return `${v.toFixed(digits)} ${units[i]}`;
}

function formatLastModified(v: any) {
    const s = typeof v === "string" ? v : "";
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString();
}
