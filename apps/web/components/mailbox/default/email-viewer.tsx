// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import type { MessageEntity } from "@db";
import { ActionIcon } from "@mantine/core";
import { Ellipsis } from "lucide-react";

/** Base, professional-looking email styles */
const BASE_CSS = `
:host {
  --bg: #ffffff;
  --text: #0f172a;      /* slate-900 */
  --muted: #475569;     /* slate-600 */
  --border: #e5e7eb;    /* gray-200 */
  --quote-bg: #f8fafc;  /* slate-50 */
  --quote-bar: #cbd5e1; /* slate-300 */
  color: var(--text);
  display: block;
}

.email-root {
  font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
  background: var(--bg);
  color: var(--text);
   word-break: break-word;
   overflow-wrap: anywhere;       /* allow wrapping mid-word */
   white-space: normal !important; /* override inline nowrap */
}


.email-root * {
  word-wrap: break-word !important; /* enforce wrapping for nested tags */
  white-space: normal !important;   /* neutralize inline nowrap */
}

.email-root p { margin: 0 0 .85em; }
.email-root p:last-child { margin-bottom: 0; }

.email-root h1, .email-root h2, .email-root h3,
.email-root h4, .email-root h5, .email-root h6 {
  margin: 1.2em 0 .6em; line-height: 1.25; font-weight: 600;
}
.email-root h1 { font-size: 1.375rem; }
.email-root h2 { font-size: 1.25rem; }
.email-root h3 { font-size: 1.125rem; }

.email-root ul, .email-root ol { padding-left: 1.25rem; margin: .5rem 0 .85rem; }
.email-root li { margin: .25rem 0; }

.email-root a { color: #2563eb; text-decoration: none; }
.email-root a:hover { text-decoration: underline; }

.email-root img, .email-root video, .email-root canvas, .email-root svg {
  max-width: 100% !important; height: auto !important;
}

/* Don’t style tables/cells; just prevent overflow */
.email-root table { max-width: 85vw; }
.email-root .table-scroll { overflow-x: auto; }

/* Pre/code */
.email-root pre, .email-root code, .email-root kbd, .email-root samp {
  font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
}
.email-root pre { padding: .75rem; background: #0f172a0d; border-radius: .375rem; overflow: auto; }

/* Softer <hr>, and hide a leading one */
.email-root hr {
  border: 0; border-top: 1px solid var(--border);
  margin: 1rem 0; height: 1px; opacity: .7;
}
.email-root > hr:first-child { display: none; }

/* Quoted/reply blocks */
.email-root blockquote,
.email-root blockquote[type="cite"],
.email-root .gmail_quote,
.email-root .gmail_quote_container blockquote,
.email-root .moz-cite-prefix + blockquote,
.email-root blockquote blockquote {
  font-size: 0.92rem !important;
  color: var(--muted) !important;
  background: var(--quote-bg) !important;
  border-left: 3px solid var(--quote-bar) !important;
  margin: .75rem 0 !important;
  padding: .5rem .75rem !important;
}
`;

/** When hiding quoted content entirely */
const QUOTE_HIDE_CSS = `
/* Gmail / generic */
blockquote,
blockquote[type="cite"],
.gmail_quote,
.gmail_quote_container blockquote,
/* Thunderbird */
.moz-cite-prefix + blockquote,
/* Outlook-ish nested reply borders */
div[style*="border-left"][style*="solid"] blockquote {
  display: none !important;
}
`;

export default function EmailViewer({ message }: { message: MessageEntity }) {
	const hostRef = useRef<HTMLDivElement>(null);
	const [hideQuotes, setHideQuotes] = useState(true);

	// Heuristic: does the message contain typical quoted markers?
	const hasQuotes = useMemo(() => {
		const html = message.html || "";
		if (!html.trim()) return false;
		return /<blockquote\b|class=["']gmail_quote|blockquote\s+type=["']cite|class=["']moz-cite-prefix/i.test(
			html,
		);
	}, [message.html]);

	useEffect(() => {
		if (!hostRef.current) return;

		let shadow = hostRef.current.shadowRoot;
		if (!shadow) shadow = hostRef.current.attachShadow({ mode: "open" });

		// Prefer HTML; fall back to text (escaped) with basic <pre>-like formatting
		const rawHtml =
			message.html && message.html.trim()
				? message.html
				: `<div style="white-space: pre-wrap;padding: 6px;">${(
						message.text || "No content"
					)
						.toString()
						.replace(
							/[<>&]/g,
							(c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string,
						)}</div>`;

		const safeHtml = DOMPurify.sanitize(rawHtml, {
			USE_PROFILES: { html: true },
		});

		// Inject styles + content
		shadow.innerHTML = `
      <style>${BASE_CSS}${hideQuotes ? QUOTE_HIDE_CSS : ""}</style>
      <article class="email-root">${safeHtml}</article>
    `;

		// Post-process links for safety
		const root = shadow.querySelector(".email-root") as HTMLElement | null;
		if (root) {
			const links = root.querySelectorAll<HTMLAnchorElement>("a[href]");
			links.forEach((a) => {
				a.target = "_blank";
				a.rel = "nofollow noopener noreferrer";
			});
		}
	}, [message.html, message.text, hideQuotes]);

	return (
		<div className="mb-24 mt-6 overflow-x-hidden">
			<div ref={hostRef} style={{ display: "block", width: "100%" }} />
			{hasQuotes && (
				<ActionIcon
					type="button"
					variant="light"
					size="xs"
					onClick={() => setHideQuotes((v) => !v)}
					className="my-2 px-2 py-1 rounded border text-[12px] text-gray-600 hover:bg-gray-50"
					title={hideQuotes ? "Show previous emails" : "Hide previous emails"}
				>
					<Ellipsis size={16} />
				</ActionIcon>
			)}
		</div>
	);
}
