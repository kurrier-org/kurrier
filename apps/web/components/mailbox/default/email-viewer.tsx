// @ts-nocheck
"use client";

import type { MessageEntity } from "@db";
import { ActionIcon, Button } from "@mantine/core";
import DOMPurify from "dompurify";
import { Ellipsis } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
	color: var(--text);
}

.email-root {
	background: var(--bg);
	color: var(--text);
	font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
	overflow-wrap: anywhere;
	word-break: break-word;
}

.email-root * {
	box-sizing: border-box;
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

.email-root ul,
.email-root ol {
	margin: 0.5rem 0 0.85rem;
	padding-left: 1.25rem;
}

.email-root li {
	margin: 0.25rem 0;
}

.email-root a {
	color: #2563eb;
	text-decoration: none;
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

.email-root table {
	max-width: 100% !important;
}

.email-root pre,
.email-root code,
.email-root kbd,
.email-root samp {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.email-root pre {
	overflow: auto;
	padding: 0.75rem;
	border-radius: 0.375rem;
	background: #0f172a0d;
	white-space: pre-wrap;
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
`;

const QUOTE_HIDE_CSS = `
blockquote,
blockquote[type="cite"],
.gmail_quote,
.gmail_quote_container,
.gmail_quote_container blockquote,
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

const escapeText = (value: string) =>
	value.replace(
		/[<>&]/g,
		(character) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
			})[character] as string,
	);

const prepareHtml = (rawHtml: string, allowRemoteImages: boolean) => {
	const sanitized = DOMPurify.sanitize(rawHtml, {
		USE_PROFILES: {
			html: true,
		},
	});

	const doc = new DOMParser().parseFromString(sanitized, "text/html");

	let hasRemoteImages = false;

	doc.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
		const src = image.getAttribute("src") ?? "";
		const srcset = image.getAttribute("srcset") ?? "";

		const hasRemoteSrc = /^https?:\/\//i.test(src);

		const hasRemoteSrcset = /(?:^|,\s*)https?:\/\//i.test(srcset);

		if (!hasRemoteSrc && !hasRemoteSrcset) {
			return;
		}

		hasRemoteImages = true;

		if (allowRemoteImages) {
			return;
		}

		if (hasRemoteSrc) {
			image.dataset.blockedSrc = src;
			image.removeAttribute("src");
		}

		if (hasRemoteSrcset) {
			image.dataset.blockedSrcset = srcset;
			image.removeAttribute("srcset");
		}

		if (!image.getAttribute("alt")) {
			image.setAttribute("alt", "Remote image blocked");
		}
	});

	return {
		html: doc.body.innerHTML,
		hasRemoteImages,
		hasQuotes: Boolean(doc.querySelector(QUOTE_SELECTOR)),
	};
};

export default function EmailViewer({ message }: { message: MessageEntity }) {
	const dict = useOptionalDictionary();
	const hostRef = useRef<HTMLDivElement>(null);

	const [hideQuotes, setHideQuotes] = useState(true);
	const [showRemoteImages, setShowRemoteImages] = useState(false);

	const senderEmail =
		message?.from?.value?.[0]?.address?.toLowerCase() ?? "unknown";

	const remoteImagePreferenceKey = `kurrier:remote-images:${senderEmail}`;

	useEffect(() => {
		if (senderEmail === "unknown") {
			setShowRemoteImages(false);
			return;
		}

		setShowRemoteImages(
			localStorage.getItem(remoteImagePreferenceKey) === "true",
		);
	}, [remoteImagePreferenceKey, senderEmail]);

	const rawHtml = useMemo(() => {
		if (message.html?.trim()) {
			return message.html;
		}

		return `
			<div style="white-space: pre-wrap;">
				${escapeText((message.text || "No content").toString())}
			</div>
		`;
	}, [message.html, message.text]);

	const [prepared, setPrepared] = useState({
		html: "",
		hasRemoteImages: false,
		hasQuotes: false,
	});

	useEffect(() => {
		setPrepared(prepareHtml(rawHtml, showRemoteImages));
	}, [rawHtml, showRemoteImages]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

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

		const root = shadow.querySelector<HTMLElement>(".email-root");

		if (!root) return;

		root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
			link.target = "_blank";
			link.rel = "nofollow noopener noreferrer";
		});
	}, [prepared.html, hideQuotes]);

	const allowRemoteImagesForSender = () => {
		if (senderEmail === "unknown") {
			setShowRemoteImages(true);
			return;
		}

		localStorage.setItem(remoteImagePreferenceKey, "true");

		setShowRemoteImages(true);
	};

	return (
		<div className="mb-24 mt-6 min-w-0 overflow-x-hidden">
			{prepared.hasRemoteImages && !showRemoteImages && (
				<div className="mb-3 flex flex-wrap gap-2">
					<Button
						size="xs"
						variant="default"
						onClick={() => setShowRemoteImages(true)}
					>
						{dict?.mailbox?.loadRemoteImagesOnce ?? "Load remote images once"}
					</Button>

					<Button
						size="xs"
						variant="default"
						onClick={allowRemoteImagesForSender}
					>
						{dict?.mailbox?.alwaysLoadForThisSender ??
							"Always load for this sender"}
					</Button>
				</div>
			)}

			<div ref={hostRef} className="block w-full" />

			{prepared.hasQuotes && (
				<ActionIcon
					type="button"
					variant="light"
					size="xs"
					onClick={() => setHideQuotes((current) => !current)}
					className="my-2 rounded border px-2 py-1 text-[12px] text-gray-600 hover:bg-gray-50"
					title={hideQuotes ? "Show previous emails" : "Hide previous emails"}
					aria-label={
						hideQuotes ? "Show previous emails" : "Hide previous emails"
					}
				>
					<Ellipsis size={16} />
				</ActionIcon>
			)}
		</div>
	);
}
