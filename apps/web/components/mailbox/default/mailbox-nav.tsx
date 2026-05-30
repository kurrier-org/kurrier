"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Inbox, Send, FileText, Archive, Ban, Trash2, Folder } from "lucide-react";
import { MailboxEntity } from "@db";

type Mailbox = MailboxEntity & {
	unreadCount?: number | null;
	unreadThreads?: number | null;
};

const systemOrder: Mailbox["kind"][] = [
	"inbox",
	"drafts",
	"sent",
	"archive",
	"spam",
	"trash",
	"outbox",
];

const orderIndex = (kind: Mailbox["kind"]) => {
	const index = systemOrder.indexOf(kind);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const iconFor: Record<Mailbox["kind"], React.ElementType> = {
	inbox: Inbox,
	sent: Send,
	drafts: FileText,
	archive: Archive,
	spam: Ban,
	trash: Trash2,
	outbox: Send,
	custom: Folder,
};

export function MailboxNav({
	mailboxes,
	identityPublicId,
}: {
	mailboxes: Mailbox[];
	identityPublicId: string;
	onCreateLabel?: () => void;
}) {
	const pathname = usePathname();
	const params = useParams() as { mailboxSlug?: string };

	const sortedMailboxes = [...mailboxes].sort((a, b) => {
		const ai = orderIndex(a.kind);
		const bi = orderIndex(b.kind);
		if (ai !== bi) return ai - bi;
		return (a.name ?? a.slug ?? "").localeCompare(b.name ?? b.slug ?? "");
	});

	const Item = ({ mailbox }: { mailbox: Mailbox }) => {
		const Icon = iconFor[mailbox.kind] ?? Folder;
		const slug = mailbox.slug ?? "inbox";
		const href = `/dashboard/mail/${identityPublicId}/${slug}`;
		const unreadCount = Number(mailbox.unreadCount ?? 0);

		const isActive =
			pathname === href || (params.mailboxSlug == null && slug === "inbox");

		return (
			<Link
				href={href}
				className={cn(
					"group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
					"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
				)}
			>
				<Icon className="h-4 w-4 shrink-0" />
				<span className="min-w-0 truncate">
					{mailbox.kind === "custom"
						? (mailbox.name ?? "Folder")
						: titleFor(mailbox.kind)}
				</span>
				{unreadCount > 0 ? (
					<Badge variant={isActive ? "secondary" : "outline"} className="ml-auto">
						{unreadCount}
					</Badge>
				) : null}
			</Link>
		);
	};

	return (
		<div className="space-y-4 px-2">
			<div className="space-y-1">
				{sortedMailboxes.map((mailbox) => (
					<Item key={mailbox.id} mailbox={mailbox} />
				))}
			</div>
		</div>
	);
}

function titleFor(kind: Mailbox["kind"]) {
	switch (kind) {
		case "inbox":
			return "Inbox";
		case "sent":
			return "Sent";
		case "drafts":
			return "Drafts";
		case "archive":
			return "Archive";
		case "spam":
			return "Spam";
		case "trash":
			return "Trash";
		case "outbox":
			return "Outbox";
		default:
			return "Mailbox";
	}
}
