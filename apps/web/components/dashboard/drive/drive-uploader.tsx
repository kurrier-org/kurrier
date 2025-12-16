"use client";
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActionIcon, Progress } from "@mantine/core";
import { X } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { DriveState } from "@schema";
import {getCloudUploadUrl, refreshViewAfterUpload} from "@/lib/actions/drive";

export type DriveUploaderHandle = {
    openPicker: () => void;
};

type UploadState = "queued" | "uploading" | "done" | "error" | "canceled";

type UploadItem = {
    id: string;
    file: File;
    progress: number;
    state: UploadState;
    abort?: AbortController;
    error?: string;
    xhr?: XMLHttpRequest;
};

function joinPaths(base: string, leaf: string) {
    const b = (base || "/").replace(/\/+$/g, "");
    const l = (leaf || "").replace(/^\/+/g, "");
    const out = `${b}/${l}`;
    return out === "" ? "/" : out;
}

function encodePathForRoute(path: string) {
    const parts = path.split("/").filter(Boolean).map(encodeURIComponent);
    return "/" + parts.join("/");
}

const DriveUploader = forwardRef<DriveUploaderHandle>(function DriveUploader(_props, ref) {
    const { state } = useDynamicContext<DriveState>();
    const ctx = state?.driveRouteContext;

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [items, setItems] = useState<UploadItem[]>([]);

    const canUpload = !!ctx;

    const uploadBase = useMemo(() => {
        if (!ctx) return null;
        return {
            withinPath: ctx.withinPath ?? "/",
        };
    }, [ctx]);

    useImperativeHandle(ref, () => ({
        openPicker() {
            if (!canUpload) return;
            inputRef.current?.click();
        },
    }), [canUpload]);

    function startUpload(itemId: string, file: File, targetFullPath: string) {
        const xhr = new XMLHttpRequest();

        const urlPath = encodePathForRoute(targetFullPath);
        const url = `/webdav/entries?path=${urlPath}`;

        xhr.open("POST", url, true);

        xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return;
            const p = Math.max(0, Math.min(100, Math.round((e.loaded / e.total) * 100)));
            setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: p } : it)));
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: 100, state: "done" } : it)));
                refreshViewAfterUpload();
            } else {
                setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, state: "error", error: `HTTP ${xhr.status}` } : it)));
            }
        };

        xhr.onerror = () => {
            setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, state: "error", error: "Network error" } : it)));
        };

        xhr.onabort = () => {
            setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, state: "canceled" } : it)));
        };

        setItems((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, xhr, state: "uploading", progress: 0 } : it)),
        );

        xhr.send(file);
    }


    async function startCloudUpload(itemId: string, file: File) {
        if (!ctx?.driveVolume || ctx.driveVolume.kind !== "cloud") throw new Error("Missing cloud volume");

        try {
            const presign = await getCloudUploadUrl(ctx, {
                filename: file.name,
                sizeBytes: file.size,
                contentType: file.type || null,
            });

            const xhr = new XMLHttpRequest();

            setItems((prev) =>
                prev.map((it) => (it.id === itemId ? { ...it, xhr, state: "uploading", progress: 0 } : it)),
            );

            xhr.upload.onprogress = (e) => {
                if (!e.lengthComputable) return;
                const p = Math.max(0, Math.min(100, Math.round((e.loaded / e.total) * 100)));
                setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: p } : it)));
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setItems((prev) =>
                        prev.map((it) => (it.id === itemId ? { ...it, progress: 100, state: "done" } : it)),
                    );
                    refreshViewAfterUpload();
                } else {
                    setItems((prev) =>
                        prev.map((it) =>
                            it.id === itemId ? { ...it, state: "error", error: `HTTP ${xhr.status}` } : it,
                        ),
                    );
                }
            };

            xhr.onerror = () => {
                setItems((prev) =>
                    prev.map((it) => (it.id === itemId ? { ...it, state: "error", error: "Network error" } : it)),
                );
            };

            xhr.onabort = () => {
                setItems((prev) =>
                    prev.map((it) => (it.id === itemId ? { ...it, state: "canceled" } : it)),
                );
            };

            xhr.open("PUT", presign.url, true);

            const headers = presign.headers || {};
            for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

            if (!("content-type" in Object.keys(headers).reduce((a, k) => ((a[k.toLowerCase()] = true), a), {} as Record<string, boolean>))) {
                xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
            }

            xhr.send(file);
        } catch (e: any) {
            setItems((prev) =>
                prev.map((it) => (it.id === itemId ? { ...it, state: "error", error: e?.message || "Upload failed" } : it)),
            );
        }
    }

    async function enqueueFiles(files: File[]) {
        if (!uploadBase) return;

        // const isCloud = ctx?.driveVolume?.kind === "cloud";
        const isCloud = ctx?.scope === "cloud";
        if (isCloud && !ctx.driveVolume) return;

        const now = Date.now();
        const newItems: UploadItem[] = files.map((f, idx) => ({
            id: `${now}-${idx}-${crypto.randomUUID()}`,
            file: f,
            progress: 0,
            state: "queued",
        }));

        setItems((prev) => [...newItems, ...prev]);

        for (const it of newItems) {
            const fullPath = joinPaths(uploadBase.withinPath, it.file.name);
            if (isCloud) {
                startCloudUpload(it.id, it.file);
            } else {
                startUpload(it.id, it.file, fullPath);
            }
        }
    }

    function cancel(id: string) {
        setItems((prev) => {
            const it = prev.find((x) => x.id === id);
            if (it?.xhr && it.state === "uploading") it.xhr.abort();
            if (it?.abort && it.state === "uploading") it.abort.abort();
            return prev.map((x) => (x.id === id ? { ...x, state: "canceled" } : x));
        });
    }

    const visible = items.filter((it) => it.state === "uploading" || it.state === "queued" || it.state === "error");

    return (
        <div className="mt-2">
            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (!files.length) return;
                    await enqueueFiles(files);
                }}
            />

            {!canUpload ? null : visible.length === 0 ? (
                <div className="text-center text-xs text-neutral-500"> </div>
            ) : (
                <div className="space-y-2">
                    {visible.slice(0, 5).map((it) => (
                        <div key={it.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                        {it.file.name}
                                    </div>
                                    <div className="mt-1">
                                        <Progress value={it.progress} size="sm" />
                                    </div>
                                    {it.state === "error" ? (
                                        <div className="mt-1 text-[11px] text-red-600">{it.error ?? "Upload failed"}</div>
                                    ) : null}
                                </div>

                                <ActionIcon size="sm" variant="subtle" onClick={() => cancel(it.id)}>
                                    <X size={14} />
                                </ActionIcon>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default DriveUploader;
export { DriveUploader };
