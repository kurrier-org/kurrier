"use client";

import { useState } from "react";
import type { DriveEntryEntity } from "@db";
import { Modal } from "@mantine/core";
import {
	IconArchive,
	IconCode,
	IconFile,
	IconFileSpreadsheet,
	IconFileText,
	IconFileTypeDoc,
	IconFileTypePdf,
	IconFileTypePpt,
	IconFolder,
	IconMusic,
	IconPhoto,
	IconVideo,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { toast } from "sonner";

import DriveEntryOptions from "@/components/dashboard/drive/drive-entry-options";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { getDrivePreviewUrl } from "@/lib/actions/drive";

type DriveEntryProps = {
	entry: DriveEntryEntity;
	view?: "grid" | "list";
};

export default function DriveEntry({
									   entry,
									   view = "grid",
								   }: DriveEntryProps) {
	return <DriveTile entry={entry} view={view} />;
}

function DriveTile({ entry, view = "grid" }: DriveEntryProps) {
	const dict = useOptionalDictionary();
	const meta = entry.metaData as { lastModified?: unknown } | null;
	const lastModified = meta?.lastModified ?? null;
	const ext = guessExt(entry);
	const { Icon, badge } = pickIconAndBadge(entry, ext, dict);
	const { locale } = useParams<{ locale: string }>();
	const pathname = usePathname();
	const base = pathname.replace(/\/$/, "");
	const prettyName = formatEntryName(entry.name);

	const folderHref =
		entry.type === "folder" ? `${base}/${encodeURIComponent(entry.name)}` : "#";

	const [preview, setPreview] = useState<{
		url: string;
		mimeType: string;
	} | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	const openPreview = async () => {
		if (previewLoading) return;

		setPreviewLoading(true);

		try {
			const result = await getDrivePreviewUrl(entry.id);

			if (!result) {
				toast.info("Preview is not available for this file.");
				return;
			}

			setPreview(result);
		} catch {
			toast.error("Could not open the preview.");
		} finally {
			setPreviewLoading(false);
		}
	};

	return (
		<div className="group min-w-0 w-full">
			{view === "list" ? (
				<div className="relative flex min-w-0 items-center gap-3 rounded-xl border bg-card py-3 pl-3 pr-14 transition-colors hover:bg-muted/30">
					{entry.type === "folder" ? (
						<Link
							href={folderHref}
							aria-label={prettyName}
							className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
						>
							<Icon className="size-5" />
						</Link>
					) : (
						<button
							type="button"
							onClick={openPreview}
							disabled={previewLoading}
							aria-label={`Preview ${prettyName}`}
							className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
						>
							<Icon className="size-5" />
						</button>
					)}

					<div className="min-w-0 flex-1">
						{entry.type === "folder" ? (
							<Link
								href={folderHref}
								title={entry.name}
								className="block truncate text-sm font-medium text-foreground"
							>
								{prettyName}
							</Link>
						) : (
							<button
								type="button"
								onClick={openPreview}
								disabled={previewLoading}
								title={entry.name}
								className="block max-w-full truncate text-left text-sm font-medium text-foreground hover:underline disabled:opacity-50"
							>
								{prettyName}
							</button>
						)}
					</div>

					{badge && (
						<span className="hidden shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
							{badge}
						</span>
					)}

					{entry.type !== "folder" && (
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
							{formatBytes(entry.sizeBytes ?? 0)}
						</span>
					)}

					{lastModified && (
						<span
							className="hidden w-36 shrink-0 text-right text-xs text-muted-foreground md:block"
							suppressHydrationWarning
						>
							{formatLastModified(lastModified, locale)}
						</span>
					)}

					<DriveEntryOptions entry={entry} />
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/30">
					<div className="relative h-28 overflow-hidden border-b bg-muted/20 sm:h-32">
						<div className="absolute left-3 top-3">
							<div className="flex size-9 items-center justify-center rounded-lg border bg-background/80 text-muted-foreground backdrop-blur">
								<Icon className="h-5 w-5" />
							</div>
						</div>

						<DriveEntryOptions entry={entry} />

						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							{entry.type === "file" ? (
								<button
									type="button"
									onClick={openPreview}
									disabled={previewLoading}
									aria-label={`Preview ${prettyName}`}
									className="pointer-events-auto flex size-14 items-center justify-center rounded-xl border bg-background text-muted-foreground hover:text-foreground disabled:opacity-50 sm:size-16"
								>
									<Icon className="size-7 sm:size-8" />
								</button>
							) : (
								<div className="flex size-14 items-center justify-center rounded-xl border bg-background text-muted-foreground sm:size-16">
									<Icon className="size-7 sm:size-8" />
								</div>
							)}
						</div>

						{badge ? (
							<div className="absolute bottom-3 left-3">
								<span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
									{badge}
								</span>
							</div>
						) : null}
					</div>

					<div className="flex items-start gap-3 px-4 py-3">
						<div className="min-w-0 flex-1">
							{entry.type === "folder" ? (
								<Link
									href={folderHref}
									title={entry.name}
									className="block truncate text-sm font-medium text-foreground"
								>
									{prettyName}
								</Link>
							) : (
								<button
									type="button"
									onClick={openPreview}
									disabled={previewLoading}
									title={entry.name}
									className="block w-full truncate text-left text-sm font-medium text-foreground hover:underline disabled:opacity-50"
								>
									{prettyName}
								</button>
							)}

							<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
								{entry.type !== "folder" && (
									<>
										<span className="tabular-nums">
											{formatBytes(entry.sizeBytes ?? 0)}
										</span>
										<Dot />
									</>
								)}

								{lastModified && (
									<span
										className="truncate"
										suppressHydrationWarning
									>
										{formatLastModified(lastModified, locale)}
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			<Modal
				opened={preview !== null}
				onClose={() => setPreview(null)}
				title={prettyName}
				size="xl"
				centered
			>
				{preview?.mimeType === "application/pdf" ? (
					<iframe
						src={preview.url}
						title={prettyName}
						className="h-[75vh] w-full rounded-md border"
					/>
				) : preview ? (
					<img
						src={preview.url}
						alt={prettyName}
						className="mx-auto max-h-[75vh] max-w-full object-contain"
					/>
				) : null}
			</Modal>
		</div>
	);
}

function Dot() {
	return <span className="size-1 rounded-full bg-border" />;
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

function pickIconAndBadge(
	entry: DriveEntryEntity,
	ext: string | null,
	dict: ReturnType<typeof useOptionalDictionary>,
) {
	if (entry.type === "folder") return { Icon: IconFolder, badge: "" };

	const mime = cleanMime(entry.mimeType ?? "").toLowerCase();

	if (mime.includes("pdf") || ext === "pdf")
		return { Icon: IconFileTypePdf, badge: dict?.drive?.badgePdf ?? "PDF" };

	if (
		mime.startsWith("image/") ||
		["png", "jpg", "jpeg", "webp", "gif", "svg", "heic"].includes(ext ?? "")
	) {
		return { Icon: IconPhoto, badge: dict?.drive?.badgeImage ?? "Image" };
	}

	if (
		mime.startsWith("audio/") ||
		["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext ?? "")
	) {
		return { Icon: IconMusic, badge: dict?.drive?.badgeAudio ?? "Audio" };
	}

	if (
		mime.startsWith("video/") ||
		["mp4", "mov", "mkv", "webm", "avi"].includes(ext ?? "")
	) {
		return { Icon: IconVideo, badge: dict?.drive?.badgeVideo ?? "Video" };
	}

	if (["zip", "rar", "7z", "tar", "gz"].includes(ext ?? ""))
		return {
			Icon: IconArchive,
			badge: dict?.drive?.badgeArchive ?? "Archive",
		};

	if (["csv", "xls", "xlsx"].includes(ext ?? ""))
		return {
			Icon: IconFileSpreadsheet,
			badge: dict?.drive?.badgeSheet ?? "Sheet",
		};

	if (["doc", "docx"].includes(ext ?? ""))
		return { Icon: IconFileTypeDoc, badge: dict?.drive?.badgeDoc ?? "Doc" };

	if (["ppt", "pptx"].includes(ext ?? ""))
		return {
			Icon: IconFileTypePpt,
			badge: dict?.drive?.badgeSlides ?? "Slides",
		};

	if (
		mime.includes("json") ||
		mime.includes("javascript") ||
		mime.includes("typescript") ||
		mime.includes("xml") ||
		mime.includes("yaml") ||
		mime.includes("x-yaml") ||
		[
			"js",
			"ts",
			"tsx",
			"jsx",
			"json",
			"yml",
			"yaml",
			"xml",
			"toml",
			"env",
			"sql",
			"md",
			"py",
			"go",
			"rs",
			"java",
			"kt",
			"c",
			"cpp",
			"h",
			"swift",
			"php",
		].includes(ext ?? "")
	) {
		return { Icon: IconCode, badge: dict?.drive?.badgeCode ?? "Code" };
	}

	if (mime.startsWith("text/") || ["txt", "md", "rtf"].includes(ext ?? ""))
		return { Icon: IconFileText, badge: dict?.drive?.badgeText ?? "Text" };

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

function formatLastModified(v: unknown, locale: string) {
	const s = typeof v === "string" ? v : "";
	if (!s) return "";

	const date = new Date(s);
	if (Number.isNaN(date.getTime())) return "";

	return new Intl.DateTimeFormat(locale || "en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function formatEntryName(name: string) {
	const s = (name ?? "").trim();
	if (!s) return "";

	try {
		const decoded = decodeURIComponent(s);
		return decoded.replace(/\+/g, " ");
	} catch {
		return s.replace(/%20/g, " ").replace(/\+/g, " ");
	}
}
