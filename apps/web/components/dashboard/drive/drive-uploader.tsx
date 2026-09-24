"use client";

import { ActionIcon, Progress } from "@mantine/core";
import type { DriveState } from "@schema";
import { UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { getCloudUploadUrl } from "@/lib/actions/drive";

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


const dropUploaders = new Set<symbol>();

const DriveUploader = forwardRef<DriveUploaderHandle, DriveUploaderProps>(
	function DriveUploader({ uploadStrategy = "proxy" }, ref) {
		const dict = useOptionalDictionary();
		const router = useRouter();
		const { state } = useDynamicContext<DriveState>();
		const ctx = state?.driveRouteContext;

		const inputRef = useRef<HTMLInputElement | null>(null);
		const dropIdRef = useRef<symbol>(Symbol("drive-uploader"));
		const enqueueFilesRef = useRef<(files: File[]) => Promise<void>>(
			async () => {}
		);

		const [items, setItems] = useState<UploadItem[]>([]);
		const [dragActive, setDragActive] = useState(false);

		const canUpload = !!ctx?.driveVolume && ctx.scope === "cloud";

		const inFlightRef = useRef(0);
		const refreshTimerRef = useRef<number | null>(null);

		const scheduleRefresh = () => {
			if (refreshTimerRef.current) {
				window.clearTimeout(refreshTimerRef.current);
			}

			refreshTimerRef.current = window.setTimeout(() => {
				refreshTimerRef.current = null;
				router.refresh();
			}, 600);
		};

		const bumpInFlight = (delta: number) => {
			inFlightRef.current = Math.max(0, inFlightRef.current + delta);

			if (inFlightRef.current === 0) {
				scheduleRefresh();
			}
		};

		useImperativeHandle(
			ref,
			() => ({
				openPicker() {
					if (!canUpload) return;
					inputRef.current?.click();
				},
			}),
			[canUpload]
		);

		async function startUpload(itemId: string, file: File) {
			if (!ctx?.driveVolume || ctx.scope !== "cloud") {
				throw new Error(
					dict?.drive?.missingCloudVolume ?? "Missing cloud volume"
				);
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
				prev.map((item) =>
					item.id === itemId
						? {
							...item,
							xhr,
							state: "uploading",
							progress: 0,
						}
						: item
				)
			);

			xhr.upload.onprogress = (event) => {
				if (!event.lengthComputable) return;

				const progress = Math.max(
					0,
					Math.min(100, Math.round((event.loaded / event.total) * 100))
				);

				setItems((prev) =>
					prev.map((item) =>
						item.id === itemId ? { ...item, progress } : item
					)
				);
			};

			xhr.onload = () => {
				finalizeOnce(() => {
					if (xhr.status >= 200 && xhr.status < 300) {
						setItems((prev) =>
							prev.map((item) =>
								item.id === itemId
									? {
										...item,
										progress: 100,
										state: "done",
									}
									: item
							)
						);
					} else {
						setItems((prev) =>
							prev.map((item) =>
								item.id === itemId
									? {
										...item,
										state: "error",
										error: `HTTP ${xhr.status}`,
									}
									: item
							)
						);
					}
				});
			};

			xhr.onerror = () => {
				finalizeOnce(() => {
					setItems((prev) =>
						prev.map((item) =>
							item.id === itemId
								? {
									...item,
									state: "error",
									error: dict?.drive?.networkError ?? "Network error",
								}
								: item
						)
					);
				});
			};

			xhr.onabort = () => {
				finalizeOnce(() => {
					setItems((prev) =>
						prev.map((item) =>
							item.id === itemId ? { ...item, state: "canceled" } : item
						)
					);
				});
			};

			if (uploadStrategy === "direct") {
				xhr.open("PUT", presign.url, true);

				const headers = presign.headers || {};

				for (const [key, value] of Object.entries(headers)) {
					xhr.setRequestHeader(key, String(value));
				}

				const hasContentType = Object.keys(headers).some(
					(key) => key.toLowerCase() === "content-type"
				);

				if (!hasContentType) {
					xhr.setRequestHeader(
						"Content-Type",
						file.type || "application/octet-stream"
					);
				}

				xhr.send(file);
			} else {
				xhr.open("POST", "/api/drive/upload", true);

				const formData = new FormData();
				formData.append("file", file);
				formData.append("uploadToken", presign.uploadToken);

				xhr.send(formData);
			}
		}

		async function enqueueFiles(files: File[]) {
			if (!canUpload || files.length === 0) return;

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
						prev.map((current) =>
							current.id === item.id
								? {
									...current,
									state: "error",
									error:
										error instanceof Error
											? error.message
											: dict?.drive?.uploadFailed ?? "Upload failed",
								}
								: current
						)
					);
				});
			}
		}

		enqueueFilesRef.current = enqueueFiles;

		useEffect(() => {
			if (!canUpload) return;

			const dropId = dropIdRef.current;
			dropUploaders.add(dropId);

			let dragDepth = 0;

			const isActiveUploader = () =>
				dropUploaders.values().next().value === dropId;

			const containsFiles = (event: DragEvent) =>
				Array.from(event.dataTransfer?.types ?? []).includes("Files");

			const onDragEnter = (event: DragEvent) => {
				if (!isActiveUploader() || !containsFiles(event)) return;

				event.preventDefault();
				dragDepth += 1;
				setDragActive(true);
			};

			const onDragOver = (event: DragEvent) => {
				if (!isActiveUploader() || !containsFiles(event)) return;

				event.preventDefault();

				if (event.dataTransfer) {
					event.dataTransfer.dropEffect = "copy";
				}

				setDragActive(true);
			};

			const onDragLeave = (event: DragEvent) => {
				if (!isActiveUploader() || !containsFiles(event)) return;

				dragDepth = Math.max(0, dragDepth - 1);

				if (dragDepth === 0) {
					setDragActive(false);
				}
			};

			const onDrop = (event: DragEvent) => {
				if (!isActiveUploader() || !containsFiles(event)) return;

				event.preventDefault();

				dragDepth = 0;
				setDragActive(false);

				const files = Array.from(event.dataTransfer?.files ?? []);

				if (files.length > 0) {
					void enqueueFilesRef.current(files);
				}
			};

			window.addEventListener("dragenter", onDragEnter);
			window.addEventListener("dragover", onDragOver);
			window.addEventListener("dragleave", onDragLeave);
			window.addEventListener("drop", onDrop);

			return () => {
				dropUploaders.delete(dropId);

				window.removeEventListener("dragenter", onDragEnter);
				window.removeEventListener("dragover", onDragOver);
				window.removeEventListener("dragleave", onDragLeave);
				window.removeEventListener("drop", onDrop);
			};
		}, [canUpload]);

		function cancel(id: string) {
			setItems((prev) => {
				const item = prev.find((current) => current.id === id);

				if (item?.xhr && item.state === "uploading") {
					item.xhr.abort();
				}

				return prev.map((current) =>
					current.id === id ? { ...current, state: "canceled" } : current
				);
			});
		}

		const visible = items.filter(
			(item) =>
				item.state === "uploading" ||
				item.state === "queued" ||
				item.state === "error"
		);

		return (
			<div>
				<input
					ref={inputRef}
					type="file"
					multiple
					className="hidden"
					onChange={(event) => {
						const files = Array.from(event.currentTarget.files ?? []);
						event.currentTarget.value = "";

						if (files.length > 0) {
							void enqueueFiles(files);
						}
					}}
				/>

				{canUpload && dragActive && (
					<div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background/75 p-6 backdrop-blur-sm">
						<div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand bg-background p-10 text-center shadow-xl">
							<UploadCloud className="size-12 text-brand" aria-hidden="true" />
							<p className="text-lg font-semibold text-foreground">
								{dict?.drive?.uploadFiles ?? "Upload files"}
							</p>
						</div>
					</div>
				)}

				{canUpload && visible.length > 0 && (
					<div className="fixed inset-x-4 bottom-4 z-50 space-y-2 sm:left-auto sm:w-96">
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

										{item.state === "error" && (
											<div className="mt-1 text-[11px] text-red-600">
												{item.error ??
													dict?.drive?.uploadFailed ??
													"Upload failed"}
											</div>
										)}
									</div>

									<ActionIcon
										size="sm"
										variant="subtle"
										aria-label="Cancel upload"
										onClick={() => cancel(item.id)}
									>
										<X size={14} />
									</ActionIcon>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}
);

export default DriveUploader;
export { DriveUploader };
