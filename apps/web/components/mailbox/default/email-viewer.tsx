"use client";

import type { MessageEntity } from "@db";
import { ActionIcon, Button } from "@mantine/core";
import {
	Ellipsis,
	EyeOff,
	ImageOff,
} from "lucide-react";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

const BASE_CSS = `
:host {
	--bg: #ffffff;
	--text: #0f172a;
	--muted: #475569;
	--border: #e5e7eb;
	--quote-bg: #f8fafc;
	--quote-bar: #cbd5e1;

	display: block;
	width: 100%;
	color: var(--text);
}

.email-root {
	width: 100%;
	min-width: 0;
	background: var(--bg);
	color: var(--text);
	font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
	overflow-wrap: anywhere;
	word-break: break-word;
}

.email-root,
.email-root * {
	box-sizing: border-box;
}

.email-root * {
	max-width: 100%;
	overflow-wrap: anywhere;
}

.email-root p {
	margin: 0 0 0.85em;
}

.email-root p:last-child {
	margin-bottom: 0;
}

.email-root h1,
.email-root h2,
.email-root h3,
.email-root h4,
.email-root h5,
.email-root h6 {
	margin: 1.2em 0 0.6em;
	font-weight: 600;
	line-height: 1.25;
}

.email-root h1 {
	font-size: 1.375rem;
}

.email-root h2 {
	font-size: 1.25rem;
}

.email-root h3 {
	font-size: 1.125rem;
}

.email-root h4,
.email-root h5,
.email-root h6 {
	font-size: 1rem;
}

.email-root ul,
.email-root ol {
	margin: 0.5rem 0 0.85rem;
	padding-left: 1.5rem;
}

.email-root li {
	margin: 0.25rem 0;
}

.email-root a {
	color: #2563eb;
	text-decoration: none;
	overflow-wrap: anywhere;
}

.email-root a:hover {
	text-decoration: underline;
}

.email-root img,
.email-root video,
.email-root canvas,
.email-root svg {
	height: auto !important;
	max-width: 100% !important;
}

.email-root img {
	object-fit: contain;
}

.email-root iframe {
	max-width: 100% !important;
}

.email-root table {
	width: auto;
	max-width: 100% !important;
	border-collapse: collapse;
}

.email-root td,
.email-root th {
	max-width: 100%;
	overflow-wrap: anywhere;
}

.email-root pre,
.email-root code,
.email-root kbd,
.email-root samp {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.email-root pre {
	max-width: 100%;
	overflow: auto;
	padding: 0.75rem;
	border-radius: 0.375rem;
	background: #0f172a0d;
	white-space: pre-wrap;
	word-break: break-word;
}

.email-root hr {
	height: 1px;
	margin: 1rem 0;
	border: 0;
	border-top: 1px solid var(--border);
	opacity: 0.7;
}

.email-root > hr:first-child {
	display: none;
}

.email-root blockquote,
.email-root blockquote[type="cite"],
.email-root .gmail_quote,
.email-root .gmail_quote_container blockquote,
.email-root .moz-cite-prefix + blockquote,
.email-root blockquote blockquote {
	margin: 0.75rem 0 !important;
	padding: 0.5rem 0.75rem !important;
	border-left: 3px solid var(--quote-bar) !important;
	background: var(--quote-bg) !important;
	color: var(--muted) !important;
	font-size: 0.92rem !important;
}

.email-root .kurrier-plain-text {
	white-space: pre-wrap;
	word-break: break-word;
}
`;

const QUOTE_HIDE_CSS = `
blockquote,
blockquote[type="cite"],
.gmail_quote,
.gmail_quote_container,
.gmail_quote_container blockquote,
.moz-cite-prefix,
.moz-cite-prefix + blockquote,
div[style*="border-left"][style*="solid"] blockquote {
	display: none !important;
}
`;

const QUOTE_SELECTOR = [
	"blockquote",
	'blockquote[type="cite"]',
	".gmail_quote",
	".gmail_quote_container",
	".moz-cite-prefix",
].join(",");

type PreparedHtml = {
	html: string;
	hasRemoteImages: boolean;
	hasQuotes: boolean;
};

const EMPTY_PREPARED: PreparedHtml = {
	html: "",
	hasRemoteImages: false,
	hasQuotes: false,
};

const escapeText = (value: string) =>
	value.replace(/[<>&]/g, (character) => {
		const replacements: Record<string, string> = {
			"<": "&lt;",
			">": "&gt;",
			"&": "&amp;",
		};

		return replacements[character] ?? character;
	});

const isRemoteUrl = (value: string) =>
	/^https?:\/\//i.test(value.trim());

const hasRemoteSrcset = (value: string) =>
	value
		.split(",")
		.some((candidate) => {
			const url = candidate.trim().split(/\s+/)[0] ?? "";
			return isRemoteUrl(url);
		});

const prepareHtml = (
	sanitizedHtml: string,
	allowRemoteImages: boolean,
): PreparedHtml => {
	const doc = new DOMParser().parseFromString(
		sanitizedHtml,
		"text/html",
	);

	let hasRemoteImages = false;

	doc.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
		const src = image.getAttribute("src") ?? "";
		const srcset = image.getAttribute("srcset") ?? "";

		const remoteSrc = isRemoteUrl(src);
		const remoteSrcset = hasRemoteSrcset(srcset);

		if (!remoteSrc && !remoteSrcset) {
			return;
		}

		hasRemoteImages = true;

		if (allowRemoteImages) {
			return;
		}

		if (remoteSrc) {
			image.dataset.blockedSrc = src;
			image.removeAttribute("src");
		}

		if (remoteSrcset) {
			image.dataset.blockedSrcset = srcset;
			image.removeAttribute("srcset");
		}

		if (!image.getAttribute("alt")) {
			image.setAttribute("alt", "Remote image blocked");
		}
	});

	doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
		const href = link.getAttribute("href")?.trim() ?? "";

		if (/^javascript:/i.test(href)) {
			link.removeAttribute("href");
			return;
		}

		link.target = "_blank";
		link.rel = "nofollow noopener noreferrer";
	});

	return {
		html: doc.body.innerHTML,
		hasRemoteImages,
		hasQuotes: Boolean(doc.querySelector(QUOTE_SELECTOR)),
	};
};

export default function EmailViewer({
										message,
									}: {
	message: MessageEntity;
}) {
	const dict = useOptionalDictionary();
	const hostRef = useRef<HTMLDivElement>(null);

	const [hideQuotes, setHideQuotes] = useState(true);
	const [showRemoteImages, setShowRemoteImages] = useState(false);
	const [prepared, setPrepared] =
		useState<PreparedHtml>(EMPTY_PREPARED);

	const senderEmail =
		message?.from?.value?.[0]?.address?.toLowerCase() ??
		"unknown";

	const remoteImagePreferenceKey =
		`kurrier:remote-images:${senderEmail}`;

	const rawHtml = useMemo(() => {
		if (message.html?.trim()) {
			return message.html;
		}

		return `
			<div class="kurrier-plain-text">
				${escapeText(
			(message.text || "No content").toString(),
		)}
			</div>
		`;
	}, [message.html, message.text]);

	useEffect(() => {
		setHideQuotes(true);

		if (senderEmail === "unknown") {
			setShowRemoteImages(false);
			return;
		}

		try {
			setShowRemoteImages(
				localStorage.getItem(
					remoteImagePreferenceKey,
				) === "true",
			);
		} catch {
			setShowRemoteImages(false);
		}
	}, [
		message.id,
		remoteImagePreferenceKey,
		senderEmail,
	]);

	useEffect(() => {
		let cancelled = false;

		const prepare = async () => {
			try {
				const { default: DOMPurify } =
					await import("dompurify");

				const sanitized = DOMPurify.sanitize(rawHtml, {
					USE_PROFILES: {
						html: true,
					},
				});

				const result = prepareHtml(
					sanitized,
					showRemoteImages,
				);

				if (!cancelled) {
					setPrepared(result);
				}
			} catch {
				if (!cancelled) {
					setPrepared({
						html: `
							<div class="kurrier-plain-text">
								${escapeText(
							(message.text ||
								"No content").toString(),
						)}
							</div>
						`,
						hasRemoteImages: false,
						hasQuotes: false,
					});
				}
			}
		};

		void prepare();

		return () => {
			cancelled = true;
		};
	}, [
		rawHtml,
		showRemoteImages,
		message.text,
	]);

	useEffect(() => {
		const host = hostRef.current;

		if (!host) {
			return;
		}

		const shadow =
			host.shadowRoot ??
			host.attachShadow({
				mode: "open",
			});

		shadow.innerHTML = `
			<style>
				${BASE_CSS}
				${hideQuotes ? QUOTE_HIDE_CSS : ""}
			</style>

			<article class="email-root">
				${prepared.html}
			</article>
		`;
	}, [
		prepared.html,
		hideQuotes,
	]);

	const allowRemoteImagesForSender = () => {
		if (senderEmail === "unknown") {
			setShowRemoteImages(true);
			return;
		}

		try {
			localStorage.setItem(
				remoteImagePreferenceKey,
				"true",
			);
		} catch {
			// Preference persistence is optional.
		}

		setShowRemoteImages(true);
	};

	return (
		<div className="mb-24 mt-6 min-w-0 overflow-x-hidden">
			{prepared.hasRemoteImages &&
				!showRemoteImages && (
					<div className="mb-4 flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-start gap-3">
							<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
								<ImageOff className="size-4 text-muted-foreground" />
							</div>

							<div className="min-w-0">
								<p className="text-sm font-medium">
									Remote images are blocked
								</p>

								<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
									Images from external servers can be used to track when you open a message.
								</p>
							</div>
						</div>

						<div className="flex shrink-0 flex-col gap-2 sm:flex-row">
							<Button
								size="xs"
								variant="default"
								onClick={() =>
									setShowRemoteImages(true)
								}
							>
								{dict?.mailbox
										?.loadRemoteImagesOnce ??
									"Load once"}
							</Button>

							<Button
								size="xs"
								variant="light"
								onClick={
									allowRemoteImagesForSender
								}
							>
								{dict?.mailbox
										?.alwaysLoadForThisSender ??
									"Always for sender"}
							</Button>
						</div>
					</div>
				)}

			<div
				ref={hostRef}
				className="block min-w-0 w-full"
			/>

			{prepared.hasQuotes && (
				<div className="mt-3">
					<ActionIcon
						type="button"
						variant="subtle"
						size="sm"
						onClick={() =>
							setHideQuotes(
								(current) => !current,
							)
						}
						title={
							hideQuotes
								? "Show previous emails"
								: "Hide previous emails"
						}
						aria-label={
							hideQuotes
								? "Show previous emails"
								: "Hide previous emails"
						}
					>
						{hideQuotes ? (
							<Ellipsis size={17} />
						) : (
							<EyeOff size={16} />
						)}
					</ActionIcon>
				</div>
			)}
		</div>
	);
}
