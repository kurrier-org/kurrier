"use client";
import React from "react";
import { Mail, MailOpen, Paperclip, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MailboxEntity, MailboxSyncEntity } from "@db";
import {
	FetchMailboxThreadsResult,
	markAsRead,
	markAsUnread,
	moveToTrash,
	revalidateMailbox,
	toggleStar,
} from "@/lib/actions/mailbox";
import { IconStar, IconStarFilled } from "@tabler/icons-react";

type Props = {
	mailboxThreadItem: FetchMailboxThreadsResult[number];
	activeMailbox: MailboxEntity;
	identityPublicId: string;
	mailboxSync: MailboxSyncEntity | undefined;
};
import { Temporal } from "@js-temporal/polyfill";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { toast } from "sonner";

export default function WebmailListItem({
	mailboxThreadItem,
	activeMailbox,
	identityPublicId,
	mailboxSync,
}: Props) {
	function formatDateLabel(input?: string | number | Date) {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!input) return "";

		let zdt: Temporal.ZonedDateTime;
		try {
			const instant = Temporal.Instant.from(new Date(input).toISOString());
			zdt = instant.toZonedDateTimeISO(tz);
		} catch {
			return "";
		}

		const today = Temporal.Now.zonedDateTimeISO(tz).toPlainDate();
		const date = zdt.toPlainDate();

		const diffDays = today.since(date, { largestUnit: "day" }).days;

		if (diffDays === 0) {
			return zdt.toLocaleString(undefined, {
				hour: "numeric",
				minute: "2-digit",
			});
		}

		if (date.year === today.year) {
			return zdt.toLocaleString(undefined, {
				month: "short",
				day: "numeric",
			});
		}

		return zdt.toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	const router = useRouter();

	const date = new Date(mailboxThreadItem.lastActivityAt || Date.now());
	const dateLabel = formatDateLabel(date);

	const pathname = usePathname();
	const searchParams = useSearchParams();

	const openThread = async () => {
		const url = pathname.match("/dashboard/mail")
			? `/dashboard/mail/${identityPublicId}/${activeMailbox.slug}/threads/${mailboxThreadItem.threadId}`
			: `/mail/${identityPublicId}/${activeMailbox.slug}/threads/${mailboxThreadItem.threadId}`;
		router.push(url);
		// router.refresh()
		// await revalidateMailbox(`${pathname}?${searchParams.toString()}`);
	};

	// Width reserved on the right so text never collides with the overlay actions
	const ACTIONS_W = "96px"; // ~ 3 icons + gaps

	function getAllNames(p: typeof mailboxThreadItem.participants) {
		const lists = [p?.from ?? [], p?.to ?? [], p?.cc ?? [], p?.bcc ?? []];

		// keep stable order: from → to → cc → bcc; dedupe by email (case-insensitive)
		const seen = new Set<string>();
		const merged: { n?: string | null; e: string }[] = [];

		for (const list of lists) {
			for (const x of list) {
				const e = x?.e?.trim();
				if (!e) continue;
				const key = e.toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);
				merged.push({ n: x.n, e });
				if (merged.length >= 6) break; // cap to keep json small & UI tidy
			}
			if (merged.length >= 6) break;
		}

		const displayName = (x: { n?: string | null; e: string }) =>
			(x.n && x.n.trim()) || x.e;

		const names = merged.map(displayName);
		const shown = names.slice(0, 3);
		const suffix = names.length > 3 ? "…" : "";

		return shown.join(", ") + suffix;
	}

	const allNames = getAllNames(mailboxThreadItem.participants);

	const canMarkAsRead = mailboxThreadItem.unreadCount > 0;
	const canMarkAsUnread =
		mailboxThreadItem.messageCount > 0 && mailboxThreadItem.unreadCount === 0;

	const isUnread = mailboxThreadItem.unreadCount > 0;
	const isRead = mailboxThreadItem.unreadCount === 0;

	const { state, setState } = useDynamicContext<{
		selectedThreadIds: Set<string>;
	}>();

	return (
		<>
			<li
				className={[
					"relative group grid cursor-pointer", // relative → for absolute overlay
					"grid-cols-[auto_auto_minmax(16rem,1fr)_minmax(10rem,2fr)_auto]",
					"items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50",
					isRead ? "bg-muted/50" : "font-semibold",
					// threadItem.unreadCount > 0 ? "font-semibold" : "",
					`pr-[${ACTIONS_W}]`, // reserve space for overlay
				].join(" ")}
			>
				<div className="flex items-center">
					<input
						type="checkbox"
						onChange={(e) => {
							const newSet = new Set(state?.selectedThreadIds);
							if (e.target.checked) {
								newSet.add(mailboxThreadItem.threadId);
							} else {
								newSet.delete(mailboxThreadItem.threadId);
							}
							setState({ selectedThreadIds: newSet });
						}}
						checked={state?.selectedThreadIds?.has(mailboxThreadItem.threadId)}
						aria-label={`Select thread ${mailboxThreadItem.subject}`}
						className="h-4 w-4 rounded border-muted-foreground/40"
						onClick={(e) => e.stopPropagation()}
					/>
				</div>

				<button
					type="button"
					aria-label="Star"
					className="text-muted-foreground hover:text-foreground"
					onClick={() =>
						toggleStar(
							mailboxThreadItem.threadId,
							activeMailbox.id,
							mailboxThreadItem.starred,
							!!mailboxSync,
						)
					}
				>
					{mailboxThreadItem.starred ? (
						<IconStarFilled className={"text-yellow-400"} size={12} />
					) : (
						<IconStar className="h-3 w-3" />
					)}
				</button>

				<div onClick={openThread} className="truncate pr-2">
					<span className="truncate">{allNames}</span>{" "}
					{mailboxThreadItem.messageCount > 1 && (
						<span className="text-xs text-muted-foreground font-normal">
							{mailboxThreadItem.messageCount}
						</span>
					)}
				</div>

				<div
					onClick={openThread}
					className="flex min-w-0 items-center gap-1 pr-2"
				>
					<span className="truncate">{mailboxThreadItem.subject}</span>
					<span className="mx-1 text-muted-foreground">–</span>
					<span className="truncate text-muted-foreground font-normal">
						{mailboxThreadItem.previewText}
					</span>
					{mailboxThreadItem.hasAttachments && (
						<Paperclip className="ml-1 hidden h-4 w-4 text-muted-foreground md:inline" />
					)}
				</div>

				<div className="ml-auto flex items-center gap-2 pl-2">
					{mailboxThreadItem.unreadCount > 0 ? (
						<Mail className="h-4 w-4 text-primary md:hidden" />
					) : (
						<MailOpen className="h-4 w-4 text-muted-foreground md:hidden" />
					)}
					<time className="whitespace-nowrap text-sm text-foreground">
						{dateLabel}
					</time>
				</div>

				<div
					className={[
						"pointer-events-none absolute inset-y-0 right-3 flex items-center justify-end gap-1 bg-muted",
						`w-[${ACTIONS_W}]`,
						"opacity-0 transition-opacity duration-150",
						"group-hover:opacity-100 group-hover:pointer-events-auto px-3 rounded-l-4xl",
					].join(" ")}
					onClick={(e) => e.stopPropagation()}
				>
					{canMarkAsUnread && (
						<button
							onClick={async () => {
								return await markAsUnread(
									mailboxThreadItem.threadId,
									activeMailbox.id,
									!!mailboxSync,
									true,
								);
							}}
							className="rounded p-1 hover:bg-muted"
							title="Mark as unread"
						>
							<Mail className="h-4 w-4" />
						</button>
					)}
					{canMarkAsRead && (
						<button
							onClick={() =>
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
		</>
	);
}
