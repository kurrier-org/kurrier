"use client";

import type { DriveEntryEntity } from "@db";
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
import DriveEntryOptions from "@/components/dashboard/drive/drive-entry-options";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

export default function DriveEntry({ entry }: { entry: DriveEntryEntity }) {
	return <DriveTile entry={entry} />;
}

function DriveTile({ entry }: { entry: DriveEntryEntity }) {
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

	return (
		<div className="group min-w-0 w-full">
			<div className="overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/30">
				<div className="relative h-28 overflow-hidden border-b bg-muted/20 sm:h-32">
					<div className="absolute left-3 top-3">
						<div className="flex size-9 items-center justify-center rounded-lg border bg-background/80 text-muted-foreground backdrop-blur">
							<Icon className="h-5 w-5" />
						</div>
					</div>

					<DriveEntryOptions entry={entry} />

					<div className="absolute inset-0 flex items-center justify-center">
						<div className="flex size-14 items-center justify-center rounded-xl border bg-background text-muted-foreground sm:size-16">
							<Icon className="size-7 sm:size-8" />
						</div>
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
						<div className="min-w-0">
							{entry.type === "folder" ? (
								<Link
									href={folderHref}
									title={entry.name}
									className="block truncate text-sm font-medium text-foreground"
								>
									{prettyName}
								</Link>
							) : (
								<div
									title={entry.name}
									className="block truncate text-sm font-medium text-foreground"
								>
									{prettyName}
								</div>
							)}
						</div>

						<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
							{entry.type !== "folder" && (
								<>
									<span className="tabular-nums">
										{formatBytes(entry.sizeBytes ?? 0)}
									</span>{" "}
									<Dot />
								</>
							)}
							{lastModified ? (
								<span className="truncate" suppressHydrationWarning>
									{formatLastModified(lastModified, locale)}
								</span>
							) : null}
						</div>
					</div>
				</div>
			</div>
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
		return { Icon: IconArchive, badge: dict?.drive?.badgeArchive ?? "Archive" };

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
