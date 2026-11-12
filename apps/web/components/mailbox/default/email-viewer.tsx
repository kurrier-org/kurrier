"use client";

import type { MessageEntity } from "@db";
import { ActionIcon, Button } from "@mantine/core";
import { Ellipsis, EyeOff, ImageOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

const BASE_CSS = `
:host {
    display: block;
    width: 100%;
    min-width: 0;
    color-scheme: light;
}

.email-root {
    display: flow-root;
    min-width: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
}

/* Constrain images without changing table and cell dimensions. */
.email-root img {
    max-width: 100%;
}

/* Keep long plain-text messages readable. */
.email-root .kurrier-plain-text {
    margin: 0;
    padding: 16px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
}

/* Allow code blocks to scroll without forcing table reflow. */
.email-root pre {
    overflow-x: auto;
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

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const hasRemoteSrcset = (value: string) =>
	value.split(",").some((candidate) => {
		const url = candidate.trim().split(/\s+/)[0] ?? "";
		return isRemoteUrl(url);
	});

const prepareHtml = (
	sanitizedHtml: string,
	allowRemoteImages: boolean,
): PreparedHtml => {
	const doc = new DOMParser().parseFromString(sanitizedHtml, "text/html");

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

export default function EmailViewer({ message }: { message: MessageEntity }) {
	const dict = useOptionalDictionary();
	const hostRef = useRef<HTMLDivElement>(null);

	const [hideQuotes, setHideQuotes] = useState(true);
	const [showRemoteImages, setShowRemoteImages] = useState(false);
	const [prepared, setPrepared] = useState<PreparedHtml>(EMPTY_PREPARED);

	const senderEmail =
		message?.from?.value?.[0]?.address?.toLowerCase() ?? "unknown";

	const remoteImagePreferenceKey = `kurrier:remote-images:${senderEmail}`;

	const rawHtml = useMemo(() => {
		if (message.html?.trim()) {
			return message.html;
		}

		return `
			<div class="kurrier-plain-text">
				${escapeText((message.text || "No content").toString())}
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
				localStorage.getItem(remoteImagePreferenceKey) === "true",
			);
		} catch {
			setShowRemoteImages(false);
		}
	}, [message.id, remoteImagePreferenceKey, senderEmail]);

	useEffect(() => {
		let cancelled = false;

		const prepare = async () => {
			try {
				const { default: DOMPurify } = await import("dompurify");

				const sanitized = DOMPurify.sanitize(rawHtml, {
					USE_PROFILES: {
						html: true,
					},
				});

				const result = prepareHtml(sanitized, showRemoteImages);

				if (!cancelled) {
					setPrepared(result);
				}
			} catch {
				if (!cancelled) {
					setPrepared({
						html: `
							<div class="kurrier-plain-text">
								${escapeText((message.text || "No content").toString())}
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
	}, [rawHtml, showRemoteImages, message.text]);

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
	}, [prepared.html, hideQuotes]);

	const allowRemoteImagesForSender = () => {
		if (senderEmail === "unknown") {
			setShowRemoteImages(true);
			return;
		}

		try {
			localStorage.setItem(remoteImagePreferenceKey, "true");
		} catch {
			// Preference persistence is optional.
		}

		setShowRemoteImages(true);
	};

	return (
		<div className="mb-24 mt-6 min-w-0 overflow-x-auto">
			{prepared.hasRemoteImages && !showRemoteImages && (
				<div className="mb-4 flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 items-start gap-3">
						<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
							<ImageOff className="size-4 text-muted-foreground" />
						</div>

						<div className="min-w-0">
							<p className="text-sm font-medium">Remote images are blocked</p>

							<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
								Images from external servers can be used to track when you open
								a message.
							</p>
						</div>
					</div>

					<div className="flex shrink-0 flex-col gap-2 sm:flex-row">
						<Button
							size="xs"
							variant="default"
							onClick={() => setShowRemoteImages(true)}
						>
							{dict?.mailbox?.loadRemoteImagesOnce ?? "Load once"}
						</Button>

						<Button
							size="xs"
							variant="light"
							onClick={allowRemoteImagesForSender}
						>
							{dict?.mailbox?.alwaysLoadForThisSender ?? "Always for sender"}
						</Button>
					</div>
				</div>
			)}

			<div ref={hostRef} className="block min-w-0 w-full" />

			{prepared.hasQuotes && (
				<div className="mt-3">
					<ActionIcon
						type="button"
						variant="subtle"
						size="sm"
						onClick={() => setHideQuotes((current) => !current)}
						title={hideQuotes ? "Show previous emails" : "Hide previous emails"}
						aria-label={
							hideQuotes ? "Show previous emails" : "Hide previous emails"
						}
					>
						{hideQuotes ? <Ellipsis size={17} /> : <EyeOff size={16} />}
					</ActionIcon>
				</div>
			)}
		</div>
	);
}
