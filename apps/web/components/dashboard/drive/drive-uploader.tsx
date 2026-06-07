"use client";

import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { ActionIcon, Progress } from "@mantine/core";
import { X } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { DriveState } from "@schema";
import {
	getCloudUploadUrl,
	refreshViewAfterUpload,
} from "@/lib/actions/drive";

export type DriveUploaderHandle = {
	openPicker: () => void;
};

type UploadState = "queued" | "uploading" | "done" | "error" | "canceled";

type UploadItem = {
	id: string;
	file: File;
	progress: number;
	state: UploadState;
	error?: string;
	xhr?: XMLHttpRequest;
};

type UploadStrategy = "proxy" | "direct";
type DriveUploaderProps = {
	uploadStrategy?: UploadStrategy;
};

const DriveUploader = forwardRef<DriveUploaderHandle, DriveUploaderProps>(
	function DriveUploader({ uploadStrategy = "proxy" }, ref) {
		const { state } = useDynamicContext<DriveState>();
		const ctx = state?.driveRouteContext;

		const inputRef = useRef<HTMLInputElement | null>(null);
		const [items, setItems] = useState<UploadItem[]>([]);

		const canUpload = !!ctx?.driveVolume && ctx.scope === "cloud";

		const inFlightRef = useRef(0);
		const refreshTimerRef = useRef<number | null>(null);

		const scheduleRefresh = () => {
			if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
			refreshTimerRef.current = window.setTimeout(() => {
				refreshTimerRef.current = null;
				refreshViewAfterUpload();
			}, 600);
		};

		const bumpInFlight = (delta: number) => {
			inFlightRef.current = Math.max(0, inFlightRef.current + delta);
			if (inFlightRef.current === 0) scheduleRefresh();
		};

		useImperativeHandle(
			ref,
			() => ({
				openPicker() {
					if (!canUpload) return;
					inputRef.current?.click();
				},
			}),
			[canUpload],
		);

		async function startUpload(itemId: string, file: File) {
			if (!ctx?.driveVolume || ctx.scope !== "cloud") {
				throw new Error("Missing cloud volume");
			}

			const presign = await getCloudUploadUrl(ctx, {
				filename: file.name,
				sizeBytes: file.size,
				contentType: file.type || null,
			});

			const xhr = new XMLHttpRequest();

			bumpInFlight(1);

			let finalized = false;
			const finalizeOnce = (fn: () => void) => {
				if (finalized) return;
				finalized = true;
				fn();
				bumpInFlight(-1);
			};

			setItems((prev) =>
				prev.map((it) =>
					it.id === itemId
						? { ...it, xhr, state: "uploading", progress: 0 }
						: it,
				),
			);

			xhr.upload.onprogress = (e) => {
				if (!e.lengthComputable) return;

				const progress = Math.max(
					0,
					Math.min(100, Math.round((e.loaded / e.total) * 100)),
				);

				setItems((prev) =>
					prev.map((it) =>
						it.id === itemId ? { ...it, progress } : it,
					),
				);
			};

			xhr.onload = () => {
				finalizeOnce(() => {
					if (xhr.status >= 200 && xhr.status < 300) {
						setItems((prev) =>
							prev.map((it) =>
								it.id === itemId
									? { ...it, progress: 100, state: "done" }
									: it,
							),
						);
					} else {
						setItems((prev) =>
							prev.map((it) =>
								it.id === itemId
									? { ...it, state: "error", error: `HTTP ${xhr.status}` }
									: it,
							),
						);
					}
				});
			};

			xhr.onerror = () => {
				finalizeOnce(() => {
					setItems((prev) =>
						prev.map((it) =>
							it.id === itemId
								? { ...it, state: "error", error: "Network error" }
								: it,
						),
					);
				});
			};

			xhr.onabort = () => {
				finalizeOnce(() => {
					setItems((prev) =>
						prev.map((it) =>
							it.id === itemId ? { ...it, state: "canceled" } : it,
						),
					);
				});
			};

			if ( uploadStrategy === "direct" ) {
				xhr.open("PUT", presign.url, true);

				const headers = presign.headers || {};
				for (const [key, value] of Object.entries(headers)) {
					xhr.setRequestHeader(key, String(value));
				}

				const hasContentType = Object.keys(headers).some(
					(key) => key.toLowerCase() === "content-type",
				);

				if (!hasContentType) {
					xhr.setRequestHeader(
						"Content-Type",
						file.type || "application/octet-stream",
					);
				}

				xhr.send(file);
			} else if (uploadStrategy === "proxy") {
				xhr.open("POST", "/api/drive/upload", true);

				const formData = new FormData();
				formData.append("file", file);
				formData.append("bucket", presign.bucket);
				formData.append("key", presign.key);

				xhr.send(formData);
			}


		}

		async function enqueueFiles(files: File[]) {
			if (!canUpload) return;

			const now = Date.now();
			const newItems: UploadItem[] = files.map((file, index) => ({
				id: `${now}-${index}-${crypto.randomUUID()}`,
				file,
				progress: 0,
				state: "queued",
			}));

			setItems((prev) => [...newItems, ...prev]);

			for (const item of newItems) {
				startUpload(item.id, item.file).catch((error) => {
					setItems((prev) =>
						prev.map((it) =>
							it.id === item.id
								? {
									...it,
									state: "error",
									error:
										error instanceof Error
											? error.message
											: "Upload failed",
								}
								: it,
						),
					);
				});
			}
		}

		function cancel(id: string) {
			setItems((prev) => {
				const item = prev.find((x) => x.id === id);
				if (item?.xhr && item.state === "uploading") item.xhr.abort();

				return prev.map((x) =>
					x.id === id ? { ...x, state: "canceled" } : x,
				);
			});
		}

		const visible = items.filter(
			(item) =>
				item.state === "uploading" ||
				item.state === "queued" ||
				item.state === "error",
		);

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

				{canUpload && visible.length > 0 ? (
					<div className="space-y-2">
						{visible.slice(0, 5).map((item) => (
							<div
								key={item.id}
								className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950"
							>
								<div className="flex items-center gap-2">
									<div className="min-w-0 flex-1">
										<div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
											{item.file.name}
										</div>

										<div className="mt-1">
											<Progress value={item.progress} size="sm" />
										</div>

										{item.state === "error" ? (
											<div className="mt-1 text-[11px] text-red-600">
												{item.error ?? "Upload failed"}
											</div>
										) : null}
									</div>

									<ActionIcon
										size="sm"
										variant="subtle"
										onClick={() => cancel(item.id)}
									>
										<X size={14} />
									</ActionIcon>
								</div>
							</div>
						))}
					</div>
				) : null}
			</div>
		);
	},
);

export default DriveUploader;
export { DriveUploader };
