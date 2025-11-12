"use client";
import React from "react";
import { Mail, MailOpen, Paperclip, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { MailboxEntity, MailboxSyncEntity } from "@db";
import {
	FetchMailboxThreadsResult,
	markAsRead,
	markAsUnread,
	moveToTrash,
	toggleStar,
} from "@/lib/actions/mailbox";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { Temporal } from "@js-temporal/polyfill";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { toast } from "sonner";

type Props = {
	mailboxThreadItem: FetchMailboxThreadsResult[number];
	activeMailbox: MailboxEntity;
	identityPublicId: string;
	mailboxSync: MailboxSyncEntity | undefined;
};

export default function WebmailListItemMobile({
	mailboxThreadItem,
	activeMailbox,
	identityPublicId,
	mailboxSync,
}: Props) {
	const router = useRouter();

	const dateLabel = (() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		try {
			const zdt = Temporal.Instant.from(
				new Date(mailboxThreadItem.lastActivityAt || Date.now()).toISOString(),
			).toZonedDateTimeISO(tz);
			const today = Temporal.Now.zonedDateTimeISO(tz).toPlainDate();
			const d = zdt.toPlainDate();
			const diff = today.since(d, { largestUnit: "day" }).days;
			if (diff === 0)
				return zdt.toLocaleString(undefined, {
					hour: "numeric",
					minute: "2-digit",
				});
			if (d.year === today.year)
				return zdt.toLocaleString(undefined, {
					month: "short",
					day: "numeric",
				});
			return zdt.toLocaleString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch {
			return "";
		}
	})();

	const pathname = usePathname();

	const openThread = () => {
		const url = pathname.match("/dashboard/mail")
			? `/dashboard/mail/${identityPublicId}/${activeMailbox.slug}/threads/${mailboxThreadItem.threadId}`
			: `/mail/${identityPublicId}/${activeMailbox.slug}/threads/${mailboxThreadItem.threadId}`;
		router.push(url);
	};

	const ACTIONS_W = 96;

	function names(p: typeof mailboxThreadItem.participants) {
		const lists = [p?.from ?? [], p?.to ?? [], p?.cc ?? [], p?.bcc ?? []];
		const seen = new Set<string>();
		const out: { n?: string | null; e: string }[] = [];
		for (const list of lists) {
			for (const x of list) {
				const e = x?.e?.trim();
				if (!e) continue;
				const k = e.toLowerCase();
				if (seen.has(k)) continue;
				seen.add(k);
				out.push({ n: x.n, e });
				if (out.length >= 6) break;
			}
			if (out.length >= 6) break;
		}
		const toText = (x: { n?: string | null; e: string }) =>
			(x.n && x.n.trim()) || x.e;
		const arr = out.map(toText);
		return arr.slice(0, 3).join(", ") + (arr.length > 3 ? "…" : "");
	}

	const displayNames = names(mailboxThreadItem.participants);
	const canMarkAsRead = mailboxThreadItem.unreadCount > 0;
	const canMarkAsUnread =
		mailboxThreadItem.messageCount > 0 && mailboxThreadItem.unreadCount === 0;
	const isRead = mailboxThreadItem.unreadCount === 0;

	const { state, setState } = useDynamicContext<{
		selectedThreadIds: Set<string>;
	}>();

	return (
		<li
			className={[
				"relative group grid cursor-pointer",
				"grid-cols-[auto_1fr_auto] md:grid-cols-[auto_auto_minmax(16rem,1fr)_minmax(10rem,2fr)_auto]",
				"items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50",
				isRead ? "bg-muted/50" : "font-semibold",
				`md:pr-[${ACTIONS_W}px]`,
			].join(" ")}
			onClick={openThread}
		>
			{/* controls (checkbox + star) */}
			<div className="flex items-start gap-2 pt-1">
				<input
					type="checkbox"
					onClick={(e) => e.stopPropagation()}
					checked={state?.selectedThreadIds?.has(mailboxThreadItem.threadId)}
					onChange={(e) => {
						const next = new Set(state?.selectedThreadIds ?? new Set<string>());
						e.target.checked
							? next.add(mailboxThreadItem.threadId)
							: next.delete(mailboxThreadItem.threadId);
						setState({ selectedThreadIds: next });
					}}
					aria-label={`Select ${mailboxThreadItem.subject}`}
					className="h-4 w-4 rounded border-muted-foreground/40"
				/>
				<button
					aria-label="Star"
					onClick={(e) => {
						e.stopPropagation();
						toggleStar(
							mailboxThreadItem.threadId,
							activeMailbox.id,
							mailboxThreadItem.starred,
							!!mailboxSync,
						);
					}}
					className="text-muted-foreground hover:text-foreground mt-[1px]"
				>
					{mailboxThreadItem.starred ? (
						<IconStarFilled className="text-yellow-400" size={14} />
					) : (
						<IconStar className="h-3.5 w-3.5" />
					)}
				</button>
			</div>

			{/* content (2-line layout) */}
			<div className="min-w-0 flex flex-col">
				<div className="flex items-center gap-2 truncate">
					<span className="truncate">{displayNames}</span>
					{mailboxThreadItem.messageCount > 1 && (
						<span className="text-xs text-muted-foreground font-normal">
							{mailboxThreadItem.messageCount}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1 truncate text-muted-foreground font-normal text-sm">
					<span className="truncate">{mailboxThreadItem.subject}</span>
					<span className="hidden sm:inline mx-1 text-muted-foreground">–</span>
					<span className="truncate">{mailboxThreadItem.previewText}</span>
					{mailboxThreadItem.hasAttachments && (
						<Paperclip className="ml-1 h-4 w-4 text-muted-foreground hidden sm:inline" />
					)}
				</div>
			</div>

			{/* meta */}
			<div className="ml-auto flex flex-col items-end justify-start gap-1 text-right">
				<time className="whitespace-nowrap text-sm text-foreground">
					{dateLabel}
				</time>
			</div>

			{/* hover actions */}
			<div
				className={[
					"pointer-events-none absolute inset-y-0 right-3 hidden md:flex items-center justify-end gap-1 bg-muted",
					`w-[${ACTIONS_W}px]`,
					"opacity-0 transition-opacity duration-150",
					"group-hover:opacity-100 group-hover:pointer-events-auto px-3 rounded-l-4xl",
				].join(" ")}
				onClick={(e) => e.stopPropagation()}
			>
				{canMarkAsUnread && (
					<button
						onClick={async () =>
							markAsUnread(
								mailboxThreadItem.threadId,
								activeMailbox.id,
								!!mailboxSync,
								true,
							)
						}
						className="rounded p-1 hover:bg-muted"
						title="Mark as unread"
					>
						<Mail className="h-4 w-4" />
					</button>
				)}
				{canMarkAsRead && (
					<button
						onClick={async () =>
							markAsRead(
								mailboxThreadItem.threadId,
								activeMailbox.id,
								!!mailboxSync,
							)
						}
						className="rounded p-1 hover:bg-muted"
						title="Mark as read"
					>
						<MailOpen className="h-4 w-4" />
					</button>
				)}
				<button
					onClick={async () => {
						await moveToTrash(
							mailboxThreadItem.threadId,
							activeMailbox.id,
							!!mailboxSync,
							true,
						);
						toast.success("Messages moved to Trash", {
							position: "bottom-left",
						});
					}}
					className="rounded p-1 hover:bg-muted"
					title="Delete"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>
		</li>
	);
}
