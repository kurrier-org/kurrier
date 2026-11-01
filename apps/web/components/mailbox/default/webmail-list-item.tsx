"use client";
import type { MailboxEntity, MailboxSyncEntity } from "@db";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { Mail, MailOpen, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
	FetchLabelsResult,
	FetchMailboxThreadLabelsResult,
} from "@/lib/actions/labels";
import {
	type FetchMailboxThreadsResult, setReadStatus,
	toggleStar, trashThreads,
} from "@/lib/actions/mailbox";

type Props = {
	mailboxThreadItem: FetchMailboxThreadsResult[number];
	activeMailbox: MailboxEntity;
	identityPublicId: string;
	mailboxSync: MailboxSyncEntity | undefined;
	globalLabels: FetchLabelsResult;
	labelsByThreadId: FetchMailboxThreadLabelsResult;
	workspacePublicId: string;
};

import { Temporal } from "@js-temporal/polyfill";
import LabelRowTag from "@/components/dashboard/labels/label-row-tag";
import ThreadLabelHoverButtons from "@/components/dashboard/labels/thread-label-hover-buttons";
import SnoozeMail from "@/components/mailbox/default/snooze-mail";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import {ReusableFormButton} from "@/components/common/reusable-form-button";

export default function WebmailListItem({
											mailboxThreadItem,
											activeMailbox,
											identityPublicId,
											globalLabels,
											labelsByThreadId,
											workspacePublicId,
										}: Props) {
	const dict = useOptionalDictionary();

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

	function formatRelative(input?: string | number | Date) {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!input) return "";

		let zdt: Temporal.ZonedDateTime;
		try {
			const instant = Temporal.Instant.from(new Date(input).toISOString());
			zdt = instant.toZonedDateTimeISO(tz);
		} catch {
			return "";
		}

		const now = Temporal.Now.zonedDateTimeISO(tz);
		const dur = now.since(zdt, { largestUnit: "day" });

		const days = Math.abs(dur.days);
		const hours = Math.abs(dur.hours);
		const minutes = Math.abs(dur.minutes);

		if (days >= 1)
			return `${dict?.mailbox?.agoPrefix ?? ""}${days}${dict?.mailbox?.daysAbbr ?? "d ago"}`;
		if (hours >= 1)
			return `${dict?.mailbox?.agoPrefix ?? ""}${hours}${dict?.mailbox?.hoursAbbr ?? "h ago"}`;
		if (minutes >= 1)
			return `${dict?.mailbox?.agoPrefix ?? ""}${minutes}${dict?.mailbox?.minutesAbbr ?? "m ago"}`;
		return dict?.mailbox?.justNow ?? "just now";
	}

	function getThreadTimeLabel(item: typeof mailboxThreadItem) {
		const now = Date.now();

		if (item.snoozedUntil && new Date(item.snoozedUntil).getTime() > now) {
			return {
				text: dict?.mailbox?.snoozed ?? "Snoozed",
				className: "text-sm text-orange-400",
				title: `${dict?.mailbox?.snoozedUntilPrefix ?? "Snoozed until "}${new Date(item.snoozedUntil).toLocaleString()}`,
			};
		}

		if (item.unsnoozedAt) {
			const ageMs = now - new Date(item.unsnoozedAt).getTime();
			const showWindowMs = 60 * 60 * 1000;

			if (ageMs >= 0 && ageMs <= showWindowMs) {
				return {
					text: `${dict?.mailbox?.snoozedBackPrefix ?? "Snoozed back "}${formatRelative(item.unsnoozedAt)}`,
					className: "text-sm text-orange-400",
					title: `${dict?.mailbox?.returnedFromSnoozePrefix ?? "Returned from snooze "}${new Date(item.unsnoozedAt).toLocaleString()}`,
				};
			}
		}

		const date = new Date(item.lastActivityAt || now);
		return {
			text: formatDateLabel(date),
			className: "text-sm text-foreground",
			title: "",
		};
	}

	const timeLabel = getThreadTimeLabel(mailboxThreadItem);

	const pathname = usePathname();
	const isOnSnoozedPage = pathname.split("/").includes("snoozed");
	const threadUrl = pathname.match("/dashboard/mail")
		? `/w/${workspacePublicId}/dashboard/mail/${identityPublicId}/${activeMailbox.slug}/threads/${mailboxThreadItem.threadId}`
		: `/mail/${identityPublicId}/${activeMailbox.slug}/threads/${mailboxThreadItem.threadId}`;

	function getAllNames(p: typeof mailboxThreadItem.participants) {
		const lists = [p?.from ?? [], p?.to ?? [], p?.cc ?? [], p?.bcc ?? []];

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
				if (merged.length >= 6) break;
			}
			if (merged.length >= 6) break;
		}

		const displayName = (x: { n?: string | null; e: string }) =>
			x.n?.trim() || x.e;

		const names = merged.map(displayName);
		const shown = names.slice(0, 3);
		const suffix = names.length > 3 ? "…" : "";

		return shown.join(", ") + suffix;
	}

	const allNames = getAllNames(mailboxThreadItem.participants);

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
				"group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-3 py-3 transition-colors hover:bg-muted/50 xl:grid-cols-[auto_minmax(10rem,20rem)_minmax(10rem,1fr)_auto] xl:items-center xl:gap-3 xl:py-2 xl:pr-28",
				isRead ? "bg-muted/50" : "font-semibold",
			].join(" ")}
		>
			{/* Keep the existing full reload for Snoozed until its parallel route is hoisted. */}
			{isOnSnoozedPage ? (
				<a href={threadUrl} className="absolute inset-0">
					<span className="sr-only">{mailboxThreadItem.subject}</span>
				</a>
			) : (
				<Link href={threadUrl} className="absolute inset-0">
					<span className="sr-only">{mailboxThreadItem.subject}</span>
				</Link>
			)}

			<div className="relative z-10 row-span-2 flex items-start gap-2 pt-1 xl:row-span-1 xl:items-center xl:pt-0">
				{!isOnSnoozedPage && (
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
						aria-label={`${dict?.mailbox?.selectThreadPrefix ?? "Select thread "}${mailboxThreadItem.subject}`}
						className="size-4 rounded border-muted-foreground/40"
					/>
				)}


				<ReusableFormButton
					action={toggleStar}
					actionIcon
					actionIconProps={{
						variant: "subtle",
						color: "gray",
						size: "compact-xs",
						"aria-label": mailboxThreadItem.starred ? "Unstar" : "Star",
						children: mailboxThreadItem.starred ? (
							<IconStarFilled className="text-yellow-400" size={12} />
						) : (
							<IconStar size={12} />
						),
					}}
				>
					<input type="hidden" name="threadId" value={mailboxThreadItem.threadId} />
					<input type="hidden" name="mailboxId" value={activeMailbox.id} />
					<input
						type="hidden"
						name="starred"
						value={String(mailboxThreadItem.starred)}
					/>
				</ReusableFormButton>
			</div>

			<div className="pointer-events-none min-w-0 truncate pr-2">
				<span className="truncate">{allNames}</span>{" "}
				{mailboxThreadItem.messageCount > 1 && (
					<span className="text-xs text-muted-foreground font-normal">
						{mailboxThreadItem.messageCount}
					</span>
				)}
			</div>

			<div className="pointer-events-none col-start-2 flex min-w-0 items-center gap-1 pr-2 text-sm font-normal text-muted-foreground xl:col-start-auto">
				<LabelRowTag
					threadId={mailboxThreadItem.threadId}
					labelsByThreadId={labelsByThreadId}
					isRead={isRead}
				/>
				<span className="truncate text-foreground">
					{mailboxThreadItem.subject}
				</span>
				<span className="mx-1 hidden text-muted-foreground sm:inline">–</span>
				<span className="hidden truncate text-muted-foreground sm:inline">
					{mailboxThreadItem.previewText}
				</span>
				{mailboxThreadItem.hasAttachments && (
					<Paperclip className="ml-1 hidden size-4 text-muted-foreground sm:inline" />
				)}
			</div>

			<div className="pointer-events-none col-start-3 row-span-2 row-start-1 ml-auto flex flex-col items-end gap-1 pl-2 xl:col-start-auto xl:row-span-1 xl:flex-row xl:items-center xl:gap-2">
				<div className="flex items-center gap-2">
					{mailboxThreadItem.unreadCount > 0 ? (
						<Mail className="size-4 text-primary xl:hidden" />
					) : (
						<MailOpen className="size-4 text-muted-foreground xl:hidden" />
					)}
					<time
						className={["whitespace-nowrap", timeLabel.className].join(" ")}
						title={timeLabel.title}
					>
						{timeLabel.text}
					</time>
				</div>
				<div className="pointer-events-auto relative z-10 xl:hidden">
					<ThreadLabelHoverButtons
						mailboxThreadItem={mailboxThreadItem}
						labelsByThreadId={labelsByThreadId}
						allLabels={globalLabels}
					/>
				</div>
			</div>

			<div className="pointer-events-none absolute inset-y-0 right-3 z-20 hidden w-28 items-center justify-end gap-1 rounded-l-4xl bg-muted px-3 opacity-0 transition-opacity duration-100 group-hover:pointer-events-auto group-hover:opacity-100 xl:flex">
				<ThreadLabelHoverButtons
					mailboxThreadItem={mailboxThreadItem}
					labelsByThreadId={labelsByThreadId}
					allLabels={globalLabels}
				/>

				{canMarkAsUnread && (
					<ReusableFormButton
						action={setReadStatus}
						actionIcon
						actionIconProps={{
							variant: "subtle",
							color: "gray",
							size: "compact-sm",
							title: dict?.mailbox?.markAsUnread ?? "Mark as unread",
							children: <Mail size={16} />,
						}}
					>
						<input type="hidden" name="threadId" value={mailboxThreadItem.threadId} />
						<input type="hidden" name="mailboxId" value={activeMailbox.id} />
						<input type="hidden" name="op" value="unread" />
					</ReusableFormButton>
				)}

				{canMarkAsRead && (
					<ReusableFormButton
						action={setReadStatus}
						actionIcon
						actionIconProps={{
							variant: "subtle",
							color: "gray",
							size: "compact-sm",
							title: dict?.mailbox?.markAsRead ?? "Mark as read",
							children: <MailOpen size={16} />,
						}}
					>
						<input type="hidden" name="threadId" value={mailboxThreadItem.threadId} />
						<input type="hidden" name="mailboxId" value={activeMailbox.id} />
						<input type="hidden" name="op" value="read" />
					</ReusableFormButton>
				)}

				<SnoozeMail
					mailboxThreadId={mailboxThreadItem.threadId}
					activeMailboxId={activeMailbox.id}
				/>

				<ReusableFormButton
					action={trashThreads}
					actionIcon
					actionIconProps={{
						variant: "subtle",
						color: "gray",
						size: "compact-sm",
						title: dict?.mailbox?.delete ?? "Delete",
						"aria-label": dict?.mailbox?.delete ?? "Delete",
						children: <Trash2 size={16} />,
					}}
					notify={{
						kind: "toast",
						successMessage: dict?.mailbox?.movedToTrash ?? "Messages moved to Trash",
						toastProps: { position: "bottom-left" },
					}}
				>
					<input type="hidden" name="threadId" value={mailboxThreadItem.threadId} />
					<input type="hidden" name="mailboxId" value={activeMailbox.id} />
				</ReusableFormButton>
			</div>
		</li>
	);
}
