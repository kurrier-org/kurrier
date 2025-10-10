import React, { useRef, useEffect, useState } from "react";
import { MailOpen, RotateCw, Trash2 } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import {
    deltaFetch,
    FetchMailboxThreadsResult,
    markAsRead,
    moveToTrash,
    revalidateMailbox,
} from "@/lib/actions/mailbox";
import { ActionIcon, Tooltip } from "@mantine/core";
import type { MailboxEntity } from "@db";
import { toast } from "sonner";
import clsx from "clsx";

function MailListHeader({ mailboxThreads }: { mailboxThreads: FetchMailboxThreadsResult }) {
    const { state, setState } = useDynamicContext<{
        selectedThreadIds: Set<string>;
        activeMailbox?: MailboxEntity | null;
        identityPublicId: string;
    }>();

    const identityIdRef = useRef<string | undefined>(state?.activeMailbox?.identityId);
    const mailboxIdRef  = useRef<string | undefined>(state?.activeMailbox?.id);
    useEffect(() => {
        if (state?.activeMailbox?.identityId) identityIdRef.current = state.activeMailbox.identityId;
        if (state?.activeMailbox?.id)         mailboxIdRef.current  = state.activeMailbox.id;
    }, [state?.activeMailbox?.identityId, state?.activeMailbox?.id]);

    const selectedSize = state?.selectedThreadIds?.size ?? 0;
    const hasSelected  = selectedSize > 0;
    const isChecked =
        selectedSize === mailboxThreads.length && mailboxThreads.length > 0;

    const [reloading, setReloading] = useState(false);
    const reload = async () => {
        const identityId = identityIdRef.current;
        if (!identityId) return;
        try {
            setReloading(true);
            await deltaFetch({ identityId });
            await revalidateMailbox("/mail");
        } finally {
            setReloading(false);
        }
    };

    const markRead = async () => {
        await markAsRead(Array.from(state?.selectedThreadIds ?? []), String(mailboxIdRef.current), true);
    };

    const deleteThreads = async () => {
        await moveToTrash(Array.from(state?.selectedThreadIds ?? []), String(mailboxIdRef.current), true);
        toast.success("Messages moved to Trash", { position: "bottom-left" });
    };

    return (
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-3 py-2 backdrop-blur rounded-t-2xl">
            {/* Select all */}
            <input
                type="checkbox"
                onChange={(e) => {
                    const newSet = new Set(state?.selectedThreadIds ?? []);
                    if (e.target.checked) {
                        mailboxThreads.forEach((t) => newSet.add(t.threadId));
                    } else {
                        mailboxThreads.forEach((t) => newSet.delete(t.threadId));
                    }
                    setState((prev) => ({ ...(prev ?? {}), selectedThreadIds: newSet }));
                }}
                checked={isChecked}
                aria-label="Select all"
                className="h-4 w-4 rounded border-muted-foreground/40"
            />

            {/* Fixed-width action slot to prevent layout shift */}
            <div className="relative h-7 min-w-[140px]"> {/* keep width stable */}
                {/* Layer 1: Reload (shown when nothing selected) */}
                <div
                    className={clsx(
                        "absolute inset-0 flex items-center gap-2 transition-opacity",
                        hasSelected ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                >
                    <Tooltip label="Sync" withArrow>
                        <ActionIcon
                            variant="transparent"
                            onClick={reload}
                            title="Sync"
                            disabled={!identityIdRef.current || reloading}
                            className="h-7 w-7"
                        >
                            <RotateCw className={reloading ? "animate-spin" : ""} size={16} />
                        </ActionIcon>
                    </Tooltip>
                </div>

                {/* Layer 2: Bulk actions (shown when some selected) */}
                <div
                    className={clsx(
                        "absolute inset-0 flex items-center gap-1 transition-opacity",
                        hasSelected ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    <button
                        type="button"
                        onClick={deleteThreads}
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-muted"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={markRead}
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-muted"
                        title="Mark read"
                    >
                        <MailOpen className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />
        </div>
    );
}

export default MailListHeader;
