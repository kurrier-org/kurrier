"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
	Inbox,
	Send,
	FileText,
	Archive,
	Ban,
	Trash2,
	Folder,
} from "lucide-react";
import {
	FetchIdentityMailboxListResult,
	FetchMailboxUnreadCountsResult,
} from "@/lib/actions/mailbox";
import { MailboxKind } from "@schema";
import { MailboxEntity } from "@db";

const ORDER: MailboxKind[] = [
	"inbox",
	"drafts",
	"sent",
	"archive",
	"spam",
	"trash",
	"outbox",
	"custom",
];

const ICON: Record<MailboxKind, React.ElementType> = {
	inbox: Inbox,
	sent: Send,
	drafts: FileText,
	archive: Archive,
	spam: Ban,
	trash: Trash2,
	outbox: Send,
	custom: Folder,
};

const TITLE: Record<MailboxKind, string> = {
	inbox: "Inbox",
	sent: "Sent",
	drafts: "Drafts",
	archive: "Archive",
	spam: "Spam",
	trash: "Trash",
	outbox: "Outbox",
	custom: "Mailbox",
};

export default function IdentityMailboxesList({
	identityMailboxes,
	unreadCounts,
    onComplete
}: {
	identityMailboxes: FetchIdentityMailboxListResult;
	unreadCounts: FetchMailboxUnreadCountsResult;
    onComplete?: () => void;
}) {
	const pathname = usePathname();
	const params = useParams() as {
		identityPublicId?: string;
		mailboxSlug?: string;
	};

	const Item = ({
		m,
		identityPublicId,
	}: {
		m: MailboxEntity;
		identityPublicId: string;
	}) => {
		const Icon = ICON[m.kind] ?? Folder;
		const slug = m.slug ?? "inbox";
		const href = `/dashboard/mail/${identityPublicId}/${slug}`;
		const isActive =
			pathname === href ||
			(params.identityPublicId === identityPublicId &&
				(params.mailboxSlug ?? "inbox") === slug);

		return (
			<Link
				href={href}
                onClick={onComplete ? () => onComplete() : undefined}
				className={cn(
					"group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
					"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
				)}
			>
				<Icon className="h-4 w-4 shrink-0" />
				<span className="min-w-0 truncate">
					{m.kind === "custom" ? (m.name ?? "Mailbox") : TITLE[m.kind]}
					{unreadCounts.get(m.id) && (
						<span> ({unreadCounts.get(m.id)?.unreadTotal ?? 0})</span>
					)}
				</span>
			</Link>
		);
	};

	return (
		<div className="space-y-4 px-2">
			{identityMailboxes.map(({ identity, mailboxes }) => {
				const sorted = [...mailboxes].sort(
					(a, b) =>
						(ORDER.indexOf(a.kind as MailboxKind) ?? 999) -
						(ORDER.indexOf(b.kind as MailboxKind) ?? 999),
				);

				return (
					<div key={identity.id}>
						<div className="px-1 mb-1 mt-2 text-xs font-semibold text-sidebar-foreground/60">
							{identity.value}
						</div>
						<div className="space-y-1">
							{sorted.map((m) => (
								<Item
									key={`${identity.id}:${m.slug ?? m.kind}`}
									m={m as MailboxEntity}
									identityPublicId={identity.publicId}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
