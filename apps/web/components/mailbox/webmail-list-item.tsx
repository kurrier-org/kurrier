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
import {FetchWebMailResult} from "@/lib/actions/mailbox";

type Props = {
    threadItem: FetchWebMailResult[number];
    activeMailbox: MailboxEntity;
    identityPublicId: string;
};

export default function WebmailListItem({
                                           threadItem,
                                           activeMailbox,
                                           identityPublicId,
                                       }: Props) {

    const router = useRouter();

    const date = new Date(threadItem.lastActivityAt || Date.now());
    const dateLabel = isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    const openThread = () => {
        router.push(
            `/mail/${identityPublicId}/${activeMailbox.slug}/messages/${threadItem.id}`,
        );
    };

    // Width reserved on the right so text never collides with the overlay actions
    const ACTIONS_W = "96px"; // ~ 3 icons + gaps

    function getAllNames(p: typeof threadItem.participants) {
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

    const allNames = getAllNames(threadItem.participants);

    return (
        <li
            key={threadItem.id}
            onClick={openThread}
            className={[
                "relative group grid cursor-pointer", // relative → for absolute overlay
                "grid-cols-[auto_auto_minmax(16rem,1fr)_minmax(10rem,2fr)_auto]",
                "items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50",
                threadItem.unreadCount > 0 ? "font-semibold" : "",
                `pr-[${ACTIONS_W}]`, // reserve space for overlay
            ].join(" ")}
        >
            {/* Select */}
            <div className="flex items-center">
                <input
                    type="checkbox"
                    aria-label={`Select thread ${threadItem.subject}`}
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
                {threadItem.messageCount > 1 && (
                    <span className="text-xs text-muted-foreground font-normal">
						{threadItem.messageCount}
					</span>
                )}
            </div>

            {/* Subject + snippet + attachments */}
            <div className="flex min-w-0 items-center gap-1 pr-2">
                <span className="truncate">{threadItem.subject}</span>
                <span className="mx-1 text-muted-foreground">–</span>
                <span className="truncate text-muted-foreground">{threadItem.previewText}</span>
                {threadItem.hasAttachments && (
                    <Paperclip className="ml-1 hidden h-4 w-4 text-muted-foreground md:inline" />
                )}
            </div>

            {/* Date (stays in flow; overlay is separate) */}
            <div className="ml-auto flex items-center gap-2 pl-2">
                {threadItem.unreadCount > 0 ? (
                    <Mail className="h-4 w-4 text-primary md:hidden" />
                ) : (
                    <MailOpen className="h-4 w-4 text-muted-foreground md:hidden" />
                )}
                <time className="whitespace-nowrap text-sm text-foreground">
                    {dateLabel}
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
