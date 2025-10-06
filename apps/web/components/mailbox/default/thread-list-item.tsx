"use client";
import React from "react";
import {
	Archive,
	Mail,
	MailOpen,
	MoreHorizontal,
	Paperclip,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MailboxEntity } from "@db";
import { FetchMailboxThreadsResult } from "@/lib/actions/mailbox";
import { getMessageAddress, getMessageName } from "@common/mail-client";

type Props = {
	threadItem: FetchMailboxThreadsResult["threads"][number];
	activeMailbox: MailboxEntity;
	identityPublicId: string;
};

export default function ThreadListItem({
	threadItem,
	activeMailbox,
	identityPublicId,
}: Props) {
	const router = useRouter();
	const { thread, messages } = threadItem;
	if (!messages?.length) return null;

	const first = messages[0];
	const last = messages[messages.length - 1];

	const allNames = Array.from(
		new Set(messages.map((m) => getMessageName(m, "from") || getMessageAddress(m, "from"))),
	).join(", ");

	const subject = first.subject || "(no subject)";
	// const snippet = (first.text || first.textAsHtml || "")
	// 	.toString()
	// 	.replace(/\s+/g, " ")
	// 	.slice(0, 100);
	const snippet = first.snippet;

	const unread = messages.some((m) => !m.seen); // ← correct polarity
	const hasAttachments = messages.some((m) => !!m.hasAttachments);

	// const date = new Date(thread.lastMessageDate || last.date || Date.now());
	const date = new Date(last.date || Date.now());
	const dateLabel = isNaN(date.getTime())
		? ""
		: date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

	const openThread = () => {
		// router.push(`/mail/${identityPublicId}/${activeMailbox.slug}/${last.id}`);
		router.push(
			`/mail/${identityPublicId}/${activeMailbox.slug}/messages/${thread.id}`,
		);
	};

	// Width reserved on the right so text never collides with the overlay actions
	const ACTIONS_W = "96px"; // ~ 3 icons + gaps

	return (
		<li
			key={thread.id}
			onClick={openThread}
			className={[
				"relative group grid cursor-pointer", // relative → for absolute overlay
				"grid-cols-[auto_auto_minmax(16rem,1fr)_minmax(10rem,2fr)_auto]",
				"items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50",
				unread ? "font-semibold" : "",
				`pr-[${ACTIONS_W}]`, // reserve space for overlay
			].join(" ")}
		>
			{/* Select */}
			<div className="flex items-center">
				<input
					type="checkbox"
					aria-label={`Select thread ${subject}`}
					className="h-4 w-4 rounded border-muted-foreground/40"
					onClick={(e) => e.stopPropagation()}
				/>
			</div>

			{/* Star placeholder (keeps column alignment with single-message rows) */}
			<button
				type="button"
				aria-label="Star"
				className="text-muted-foreground hover:text-foreground"
				onClick={(e) => e.stopPropagation()}
			/>

			{/* Participants + count */}
			<div className="truncate pr-2">
				<span className="truncate">{allNames}</span>{" "}
				{messages.length > 1 && (
					<span className="text-xs text-muted-foreground font-normal">
						{messages.length}
					</span>
				)}
			</div>

			{/* Subject + snippet + attachments */}
			<div className="flex min-w-0 items-center gap-1 pr-2">
				<span className="truncate">{subject}</span>
				<span className="mx-1 text-muted-foreground">–</span>
				<span className="truncate text-muted-foreground">{snippet}</span>
				{hasAttachments && (
					<Paperclip className="ml-1 hidden h-4 w-4 text-muted-foreground md:inline" />
				)}
			</div>

			{/* Date (stays in flow; overlay is separate) */}
			<div className="ml-auto flex items-center gap-2 pl-2">
				{unread ? (
					<Mail className="h-4 w-4 text-primary md:hidden" />
				) : (
					<MailOpen className="h-4 w-4 text-muted-foreground md:hidden" />
				)}
				<time className="whitespace-nowrap text-sm text-foreground">
					{/*{dateLabel}*/}
				</time>
			</div>

			{/* ABSOLUTE OVERLAY ACTIONS — no layout shift, fade in on hover */}
			<div
				className={[
					"pointer-events-none absolute inset-y-0 right-3 flex items-center justify-end gap-1 bg-muted",
					`w-[${ACTIONS_W}]`,
					"opacity-0 transition-opacity duration-150",
					"group-hover:opacity-100 group-hover:pointer-events-auto",
				].join(" ")}
				onClick={(e) => e.stopPropagation()}
			>
				<button className="rounded p-1 hover:bg-muted" title="Archive">
					<Archive className="h-4 w-4" />
				</button>
				<button className="rounded p-1 hover:bg-muted" title="Delete">
					<Trash2 className="h-4 w-4" />
				</button>
				<button className="rounded p-1 hover:bg-muted" title="More">
					<MoreHorizontal className="h-4 w-4" />
				</button>
			</div>
		</li>
	);
}

// import React from 'react';
// import {FetchMailboxThreadsResult} from "@/lib/actions/mailbox";
//
// function ThreadListItem({threadItem}: {threadItem: FetchMailboxThreadsResult["threads"][number]}) {
//     console.log("threadItem", threadItem)
//     return (
//         <div>
//             Thread List Item
//         </div>
//     );
// }
//
// export default ThreadListItem;
